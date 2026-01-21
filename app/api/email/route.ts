import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, email } = body

    // 입력 검증
    if (!sessionId || !email) {
      return NextResponse.json(
        { error: 'Session ID and email are required' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // 이메일 정규화 (소문자로 변환하고 공백 제거)
    const normalizedEmail = email.toLowerCase().trim()

    // 같은 session_id로 여러 레코드가 있을 수 있으므로, 가장 최근에 완료된 레코드의 ID를 먼저 조회
    const { data: latestResult, error: findError } = await supabaseAdmin
      .from('test_results')
      .select('id')
      .eq('session_id', sessionId)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error('Error finding test result:', findError)
      return NextResponse.json(
        { error: 'Failed to find test result' },
        { status: 500 }
      )
    }

    if (!latestResult) {
      return NextResponse.json(
        { error: 'Test result not found for this session' },
        { status: 404 }
      )
    }

    // 가장 최근 레코드의 ID로 이메일 업데이트
    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('test_results')
      .update({ email: normalizedEmail })
      .eq('id', latestResult.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating email:', updateError)
      return NextResponse.json(
        { error: 'Failed to save email' },
        { status: 500 }
      )
    }

    // user_logs 테이블의 해당 레코드들도 이메일 업데이트
    const { error: logsUpdateError } = await supabaseAdmin
      .from('user_logs')
      .update({ email: normalizedEmail })
      .eq('test_result_id', latestResult.id)
      .is('email', null) // null인 경우만 업데이트 (이미 이메일이 있으면 덮어쓰지 않음)

    if (logsUpdateError) {
      console.error('Error updating user logs email:', logsUpdateError)
      // 로그 업데이트 실패해도 test_results는 업데이트되었으므로 계속 진행
    }

    // travel_image_ratings 테이블의 해당 레코드들도 이메일 업데이트
    const { error: ratingsUpdateError } = await supabaseAdmin
      .from('travel_image_ratings')
      .update({ email: normalizedEmail })
      .eq('test_result_id', latestResult.id)
      .is('email', null) // null인 경우만 업데이트 (이미 이메일이 있으면 덮어쓰지 않음)

    if (ratingsUpdateError) {
      console.error('Error updating travel image ratings email:', ratingsUpdateError)
      // 평가 업데이트 실패해도 test_results는 업데이트되었으므로 계속 진행
    }

    return NextResponse.json({ 
      success: true,
      id: updatedData.id 
    })
  } catch (error) {
    console.error('Error in email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
