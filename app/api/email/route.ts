import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  validateSessionId,
  validateEmail,
  parseRequestBodyWithSizeLimit
} from '@/lib/validation'
import { validateCSRFToken } from '@/lib/csrf'
import { validateRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate Limit 검증
  const rateLimitValidation = validateRateLimit(request, 'email')
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
    const { sessionId, email } = body

    // 입력 검증 시작
    // 1. 필수 필드 검증
    if (!sessionId || !email) {
      return NextResponse.json(
        { error: 'Session ID and email are required' },
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

    // 3. 이메일 검증
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
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

    const response = NextResponse.json({ 
      success: true,
      id: updatedData.id 
    })
    
    // Rate Limit 헤더 추가
    addRateLimitHeaders(response, rateLimitValidation)
    
    return response
  } catch (error) {
    console.error('Error in email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
