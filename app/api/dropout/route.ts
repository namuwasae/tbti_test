import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  validateSessionId,
  validateAnswers,
  validateGender,
  validateAgeGroup,
  validateRegion,
  validateNumberRange,
  validateStringLength,
  parseRequestBodyWithSizeLimit
} from '@/lib/validation'
import { validateCSRFToken } from '@/lib/csrf'
import { validateRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'
import questionsData from '@/test.json'

export async function POST(request: NextRequest) {
  // Rate Limit 검증
  const rateLimitValidation = validateRateLimit(request, 'dropout')
  if (!rateLimitValidation.allowed) {
    const response = NextResponse.json(
      { error: rateLimitValidation.error || 'Rate limit exceeded' },
      { status: rateLimitValidation.status || 429 }
    )
    if (rateLimitValidation.resetTime) {
      const retryAfter = Math.ceil((rateLimitValidation.resetTime - Date.now()) / 1000)
      response.headers.set('Retry-After', retryAfter.toString())
    }
    return response
  }

  // CSRF 검증
  const csrfValidation = validateCSRFToken(request)
  if (!csrfValidation.valid) {
    return NextResponse.json(
      { error: csrfValidation.error || 'CSRF validation failed' },
      { status: 403 }
    )
  }

  try {
    // 본문 크기 제한 검증 및 파싱
    const bodyParseResult = await parseRequestBodyWithSizeLimit(request)
    if (bodyParseResult.error) {
      return NextResponse.json(
        { error: bodyParseResult.error },
        { status: 413 } // 413 Payload Too Large
      )
    }
    const body = bodyParseResult.body!
    const { 
      sessionId, 
      questionId, 
      questionText, 
      currentQuestionIndex, 
      totalQuestions, 
      completedQuestions, 
      timeSpent,
      answers,
      gender,
      ageGroup,
      region
    } = body

    // 입력 검증 시작
    // 1. 필수 필드 검증
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // 2. 세션 ID 검증
    if (!validateSessionId(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      )
    }

    // 3. 숫자 필드 검증
    if (currentQuestionIndex !== undefined && currentQuestionIndex !== null) {
      const indexValidation = validateNumberRange(currentQuestionIndex, 0, 100, 'currentQuestionIndex')
      if (!indexValidation.valid) {
        return NextResponse.json(
          { error: indexValidation.error },
          { status: 400 }
        )
      }
    }

    if (totalQuestions !== undefined && totalQuestions !== null) {
      const totalValidation = validateNumberRange(totalQuestions, 1, 1000, 'totalQuestions')
      if (!totalValidation.valid) {
        return NextResponse.json(
          { error: totalValidation.error },
          { status: 400 }
        )
      }
    }

    if (completedQuestions !== undefined && completedQuestions !== null) {
      const completedValidation = validateNumberRange(completedQuestions, 0, 1000, 'completedQuestions')
      if (!completedValidation.valid) {
        return NextResponse.json(
          { error: completedValidation.error },
          { status: 400 }
        )
      }
    }

    if (timeSpent !== undefined && timeSpent !== null) {
      const timeValidation = validateNumberRange(timeSpent, 0, 86400, 'timeSpent') // 최대 24시간
      if (!timeValidation.valid) {
        return NextResponse.json(
          { error: timeValidation.error },
          { status: 400 }
        )
      }
    }

    // 4. questionText 길이 검증
    if (questionText !== undefined && questionText !== null) {
      const textValidation = validateStringLength(questionText, 1000, 'questionText')
      if (!textValidation.valid) {
        return NextResponse.json(
          { error: textValidation.error },
          { status: 400 }
        )
      }
    }

    // 5. 서버에서 직접 질문 데이터 로드 (클라이언트에서 보낸 questionsData는 무시)
    const questions = questionsData as Array<{
      id: number
      question: string
      type: 'single' | 'multiple'
      maxSelections?: number
      options: string[]
    }>

    // 6. 답변 데이터 검증 (있는 경우, 서버의 질문 데이터를 기반으로)
    if (answers && Array.isArray(answers) && answers.length > 0) {
      const answersValidation = validateAnswers(answers, questions)
      if (!answersValidation.valid) {
        return NextResponse.json(
          { error: `Invalid answers data: ${answersValidation.error}` },
          { status: 400 }
        )
      }
    }

    // 7. 사용자 정보 검증
    if (!validateGender(gender)) {
      return NextResponse.json(
        { error: 'Invalid gender value' },
        { status: 400 }
      )
    }

    if (!validateAgeGroup(ageGroup)) {
      return NextResponse.json(
        { error: 'Invalid age group value' },
        { status: 400 }
      )
    }

    if (!validateRegion(region)) {
      return NextResponse.json(
        { error: 'Invalid region value' },
        { status: 400 }
      )
    }

    // IP 주소와 User-Agent 추출
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // 이미 해당 session_id로 완료된 test_results가 있는지 확인 (중복 방지)
    const { data: existingResult } = await supabaseAdmin
      .from('test_results')
      .select('id')
      .eq('session_id', sessionId)
      .not('completed_at', 'is', null)
      .maybeSingle()

    // 이미 완료된 설문이 있으면 dropout 정보만 저장하지 않음 (중복 방지)
    if (existingResult) {
      return NextResponse.json({ success: true })
    }

    // 공통 ID 생성 (test_results와 user_dropouts에서 같은 id 사용)
    const commonId = crypto.randomUUID()

    // test_results 테이블에 dropout한 유저의 답변 저장 (completed_at은 null로 설정)
    let testResultId = commonId
    if (answers && Array.isArray(answers) && answers.length > 0) {
      const { data: testResult, error: testResultError } = await supabaseAdmin
        .from('test_results')
        .insert({
          id: commonId,
          session_id: sessionId,
          user_agent: userAgent,
          ip_address: ipAddress,
          gender: gender || null,
          age_group: ageGroup || null,
          region: region || null,
          answers: answers,
          completed_at: null // dropout이므로 완료되지 않음
        })
        .select()
        .single()

      if (testResultError) {
        console.error('Error saving test result for dropout:', testResultError)
        // test_results 저장 실패해도 계속 진행 (user_dropouts는 저장)
      } else {
        testResultId = testResult.id
      }
    }

    // user_dropouts 테이블에 이탈 정보 저장 (같은 id 사용)
    const { data: dropoutData, error: dropoutError } = await supabaseAdmin
      .from('user_dropouts')
      .insert({
        id: testResultId, // test_results와 같은 id 사용
        session_id: sessionId,
        user_agent: userAgent,
        ip_address: ipAddress,
        gender: gender || null,
        age_group: ageGroup || null,
        region: region || null,
        question_id: questionId || null,
        question_text: questionText || null,
        current_question_index: currentQuestionIndex,
        total_questions: totalQuestions,
        completed_questions: completedQuestions,
        time_spent_seconds: timeSpent || 0
      })
      .select()
      .single()

    if (dropoutError) {
      console.error('Error saving dropout:', dropoutError)
      return NextResponse.json(
        { error: 'Failed to save dropout' },
        { status: 500 }
      )
    }

    // user_logs 테이블에 각 질문별 상세 로그 저장
    if (answers && Array.isArray(answers) && answers.length > 0) {
      const logs: any[] = []
      
      answers.forEach((answer: any) => {
        // answer가 유효한지 확인
        if (!answer || answer.questionId === undefined || answer.questionId === null) {
          console.warn('Invalid answer object:', answer)
          return
        }
        
        const question = questions.find((q: any) => q.id === answer.questionId)
        const questionText = question?.question || ''
        
        // answer.answers가 배열인지 확인하고, 배열이 아니거나 빈 배열인 경우 처리
        const answerIndices = Array.isArray(answer.answers) ? answer.answers : []
        
        if (answerIndices.length === 0) {
          console.warn(`No answers found for question_id ${answer.questionId}`)
          // 답변이 없어도 로그는 생성 (빈 답변으로 표시)
          logs.push({
            test_result_id: testResultId, // test_results의 id 사용
            session_id: sessionId,
            question_id: answer.questionId,
            question_text: questionText,
            answer: '', // 빈 답변
            answer_index: -1, // 답변이 없음을 표시
            thinking_time_seconds: answer.thinkingTime || 0,
            gender: gender || null,
            age_group: ageGroup || null,
            region: region || null,
            email: null // 이메일은 나중에 입력될 수 있음
          })
          return
        }
        
        // 각 선택 항목마다 별도의 로그 레코드 생성
        answerIndices.forEach((answerIndex: number) => {
          const answerText = question?.options?.[answerIndex] || ''
          
          logs.push({
            test_result_id: testResultId, // test_results의 id 사용
            session_id: sessionId,
            question_id: answer.questionId,
            question_text: questionText,
            answer: answerText,
            answer_index: answerIndex,
            thinking_time_seconds: answer.thinkingTime || 0,
            gender: gender || null,
            age_group: ageGroup || null,
            region: region || null,
            email: null // 이메일은 나중에 입력될 수 있음
          })
        })
      })

      if (logs.length > 0) {
        const { error: logsError } = await supabaseAdmin
          .from('user_logs')
          .insert(logs)

        if (logsError) {
          console.error('Error saving dropout logs:', logsError)
          // 로그 저장 실패해도 이탈 정보는 저장되었으므로 계속 진행
        }
      }
    }

    const response = NextResponse.json({ success: true })
    
    // Rate Limit 헤더 추가
    addRateLimitHeaders(response, rateLimitValidation)
    
    return response
  } catch (error) {
    console.error('Error in dropout API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
