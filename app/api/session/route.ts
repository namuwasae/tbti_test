import { NextRequest, NextResponse } from 'next/server'
import { validateRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'

/**
 * 암호학적으로 안전한 세션 ID를 생성하는 API 엔드포인트
 * 클라이언트에서 이 엔드포인트를 호출하여 세션 ID를 가져올 수 있습니다.
 */
export async function GET(request: NextRequest) {
  // Rate Limit 검증
  const rateLimitValidation = validateRateLimit(request, 'session')
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
    // 암호학적으로 안전한 세션 ID 생성
    // crypto.randomUUID()를 사용하여 UUID v4 생성
    const sessionId = `session_${crypto.randomUUID()}`

    const response = NextResponse.json({ sessionId })

    // Rate Limit 헤더 추가
    addRateLimitHeaders(response, rateLimitValidation)

    return response
  } catch (error) {
    console.error('Error generating session ID:', error)
    return NextResponse.json(
      { error: 'Failed to generate session ID' },
      { status: 500 }
    )
  }
}
