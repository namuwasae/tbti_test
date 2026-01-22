import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

// CSRF 토큰 생성 (암호학적으로 안전한 랜덤 문자열)
export function generateCSRFToken(): string {
  // Node.js crypto 모듈을 사용하여 32바이트 암호학적 랜덤 데이터 생성
  return randomBytes(32).toString('base64url')
}

// CSRF 토큰 쿠키 이름
const CSRF_TOKEN_COOKIE_NAME = 'csrf-token'
const CSRF_TOKEN_HEADER_NAME = 'X-CSRF-Token'

// CSRF 토큰 쿠키 설정 (서버 사이드)
export function setCSRFTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_TOKEN_COOKIE_NAME, token, {
    httpOnly: false, // 클라이언트에서 읽을 수 있어야 함
    secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
    sameSite: 'strict', // CSRF 공격 방지
    path: '/',
    maxAge: 60 * 60 * 24, // 24시간
  })
}

// CSRF 토큰 검증
export function validateCSRFToken(request: NextRequest): { valid: boolean; error?: string } {
  // GET 요청은 CSRF 검증 제외 (안전한 메서드)
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return { valid: true }
  }

  // Origin 헤더 검증 (추가 보안)
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  // 프로덕션 환경에서 Origin/Referer 검증
  if (process.env.NODE_ENV === 'production') {
    if (!origin && !referer) {
      return { valid: false, error: 'Missing Origin or Referer header' }
    }

    // Origin이 있으면 호스트와 일치하는지 확인
    if (origin) {
      try {
        const originUrl = new URL(origin)
        if (originUrl.host !== host) {
          return { valid: false, error: 'Origin header does not match host' }
        }
      } catch {
        return { valid: false, error: 'Invalid Origin header format' }
      }
    }

    // Referer가 있으면 호스트와 일치하는지 확인
    if (referer && !origin) {
      try {
        const refererUrl = new URL(referer)
        if (refererUrl.host !== host) {
          return { valid: false, error: 'Referer header does not match host' }
        }
      } catch {
        return { valid: false, error: 'Invalid Referer header format' }
      }
    }
  }

  // CSRF 토큰 가져오기
  const cookieToken = request.cookies.get(CSRF_TOKEN_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER_NAME)

  // 토큰이 없는 경우
  if (!cookieToken || !headerToken) {
    return { valid: false, error: 'Missing CSRF token' }
  }

  // 토큰이 일치하지 않는 경우
  if (cookieToken !== headerToken) {
    return { valid: false, error: 'CSRF token mismatch' }
  }

  return { valid: true }
}

// CSRF 토큰 가져오기 (서버 사이드)
export function getCSRFTokenFromCookie(): string | null {
  const cookieStore = cookies()
  return cookieStore.get(CSRF_TOKEN_COOKIE_NAME)?.value || null
}

// CSRF 검증 미들웨어 래퍼
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // CSRF 검증
    const csrfValidation = validateCSRFToken(request)
    if (!csrfValidation.valid) {
      return NextResponse.json(
        { error: csrfValidation.error || 'CSRF validation failed' },
        { status: 403 }
      )
    }

    // 원래 핸들러 실행
    return handler(request)
  }
}

// CSRF 토큰 헤더 이름 export
export { CSRF_TOKEN_HEADER_NAME }
