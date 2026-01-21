import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, answers, questions, gender, ageGroup, region } = body

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

    return NextResponse.json({ 
      success: true,
      testResultId: testResult.id 
    })
  } catch (error) {
    console.error('Error in submit API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
