import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken, setCSRFTokenCookie } from '@/lib/csrf'
import { validateRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'

/**
 * CSRF 토큰을 생성하고 쿠키에 설정하는 API 엔드포인트
 * 클라이언트에서 이 엔드포인트를 호출하여 CSRF 토큰을 가져올 수 있습니다.
 */
export async function GET(request: NextRequest) {
  // Rate Limit 검증
  const rateLimitValidation = validateRateLimit(request, 'csrf-token')
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

  try {
    // 새로운 CSRF 토큰 생성
    const token = generateCSRFToken()

    // 응답 생성
    const response = NextResponse.json({ token })

    // 쿠키에 토큰 설정
    setCSRFTokenCookie(response, token)

    // Rate Limit 헤더 추가
    addRateLimitHeaders(response, rateLimitValidation)

    return response
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}
