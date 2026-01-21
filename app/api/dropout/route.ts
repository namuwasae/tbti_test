import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sessionId, 
      questionId, 
      questionText, 
      currentQuestionIndex, 
      totalQuestions, 
      completedQuestions, 
      timeSpent,
      answers,
      questions: questionsData,
      gender,
      ageGroup,
      region
    } = body

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
    if (answers && Array.isArray(answers) && answers.length > 0 && questionsData) {
      const logs: any[] = []
      
      answers.forEach((answer: any) => {
        // answer가 유효한지 확인
        if (!answer || answer.questionId === undefined || answer.questionId === null) {
          console.warn('Invalid answer object:', answer)
          return
        }
        
        const question = questionsData.find((q: any) => q.id === answer.questionId)
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in dropout API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
