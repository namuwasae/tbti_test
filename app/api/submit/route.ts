import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  validateSessionId,
  validateAnswers,
  validateGender,
  validateAgeGroup,
  validateRegion,
  parseRequestBodyWithSizeLimit
} from '@/lib/validation'
import { validateCSRFToken } from '@/lib/csrf'
import { validateRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'
import questionsData from '@/test.json'

export async function POST(request: NextRequest) {
  // Rate Limit 검증
  const rateLimitValidation = validateRateLimit(request, 'submit')
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
    const { sessionId, answers, gender, ageGroup, region } = body

    // 서버에서 직접 질문 데이터 로드 (클라이언트에서 보낸 questions는 무시)
    const questions = questionsData as Array<{
      id: number
      question: string
      type: 'single' | 'multiple'
      maxSelections?: number
      options: string[]
    }>

    // 입력 검증 시작
    // 1. 필수 필드 검증
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Answers must be an array' },
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

    // 3. 답변 데이터 검증 (서버의 질문 데이터를 기반으로)
    const answersValidation = validateAnswers(answers, questions)
    if (!answersValidation.valid) {
      return NextResponse.json(
        { error: `Invalid answers data: ${answersValidation.error}` },
        { status: 400 }
      )
    }

    // 5. 사용자 정보 검증
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

    // 중복 제출 방지: 같은 session_id로 이미 완료된 설문이 있는지 확인
    const { data: existingResult, error: checkError } = await supabaseAdmin
      .from('test_results')
      .select('id, completed_at')
      .eq('session_id', sessionId)
      .not('completed_at', 'is', null)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking for existing result:', checkError)
      return NextResponse.json(
        { error: 'Failed to check for existing submission' },
        { status: 500 }
      )
    }

    if (existingResult) {
      console.warn(`Duplicate submission attempt for session_id: ${sessionId}`)
      return NextResponse.json(
        { error: 'This survey has already been submitted' },
        { status: 409 } // 409 Conflict
      )
    }

    // IP 주소와 User-Agent 추출
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // test_results 테이블에 메인 레코드 생성
    const { data: testResult, error: testResultError } = await supabaseAdmin
      .from('test_results')
      .insert({
        session_id: sessionId,
        user_agent: userAgent,
        ip_address: ipAddress,
        gender: gender || null,
        age_group: ageGroup || null,
        region: region || null,
        answers: answers,
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (testResultError) {
      console.error('Error creating test result:', testResultError)
      return NextResponse.json(
        { error: 'Failed to save test result' },
        { status: 500 }
      )
    }

    // user_logs 테이블에 각 질문별 상세 로그 저장
    // 다중 선택의 경우 각 선택 항목마다 별도의 레코드 생성
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
          test_result_id: testResult.id,
          session_id: sessionId,
          question_id: answer.questionId,
          question_text: questionText,
          answer: '', // 빈 답변
          answer_index: -1, // 답변이 없음을 표시
          thinking_time_seconds: answer.thinkingTime || 0,
          gender: gender || null,
          age_group: ageGroup || null,
          region: region || null,
          email: null
        })
        return
      }
      
      // 각 선택 항목마다 별도의 로그 레코드 생성
      answerIndices.forEach((answerIndex: number) => {
        const answerText = question?.options?.[answerIndex] || ''
        
        logs.push({
          test_result_id: testResult.id,
          session_id: sessionId,
          question_id: answer.questionId,
          question_text: questionText,
          answer: answerText, // 개별 답변 텍스트
          answer_index: answerIndex, // 각 선택 항목의 인덱스
          thinking_time_seconds: answer.thinkingTime || 0, // 동일한 체류 시간
          gender: gender || null,
          age_group: ageGroup || null,
          region: region || null,
          email: null // 이메일은 나중에 입력될 수 있음
        })
      })
    })

    const { error: logsError } = await supabaseAdmin
      .from('user_logs')
      .insert(logs)

    if (logsError) {
      console.error('Error saving user logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to save user logs' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({ 
      success: true,
      testResultId: testResult.id 
    })
    
    // Rate Limit 헤더 추가
    addRateLimitHeaders(response, rateLimitValidation)
    
    return response
  } catch (error) {
    console.error('Error in submit API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
