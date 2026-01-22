import { NextRequest } from 'next/server'

// Rate limit 설정 인터페이스
interface RateLimitConfig {
  maxRequests: number // 최대 요청 수
  windowMs: number // 시간 윈도우 (밀리초)
}

// 엔드포인트별 Rate Limit 설정
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'csrf-token': {
    maxRequests: 10, // 10 requests
    windowMs: 60 * 1000, // per minute
  },
  'session': {
    maxRequests: 5, // 5 requests (세션은 한 번만 생성)
    windowMs: 60 * 1000, // per minute
  },
  'submit': {
    maxRequests: 5, // 5 requests
    windowMs: 60 * 1000, // per minute
  },
  'dropout': {
    maxRequests: 20, // 20 requests
    windowMs: 60 * 1000, // per minute
  },
  'travel-rating': {
    maxRequests: 30, // 30 requests
    windowMs: 60 * 1000, // per minute
  },
  'email': {
    maxRequests: 5, // 5 requests
    windowMs: 60 * 1000, // per minute
  },
  'travel-dropout': {
    maxRequests: 20, // 20 requests
    windowMs: 60 * 1000, // per minute
  },
}

// 요청 기록 인터페이스
interface RequestRecord {
  count: number
  resetTime: number
}

// 메모리 기반 Rate Limit 저장소
// 프로덕션 환경에서는 Redis나 다른 분산 스토리지를 사용하는 것이 좋습니다
const rateLimitStore = new Map<string, RequestRecord>()

// 정리 작업: 만료된 레코드 제거 (메모리 누수 방지)
const cleanupInterval = 60 * 1000 // 1분마다 정리
setInterval(() => {
  const now = Date.now()
  // ES5 호환성을 위해 forEach 사용
  rateLimitStore.forEach((record, key) => {
    if (record.resetTime < now) {
      rateLimitStore.delete(key)
    }
  })
}, cleanupInterval)

// IP 주소 추출
export function getClientIP(request: NextRequest): string {
  // Vercel 및 다른 프록시 환경에서 IP 주소 추출
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for는 여러 IP를 포함할 수 있음 (프록시 체인)
    // 첫 번째 IP가 원본 클라이언트 IP
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  // Fallback: 연결 IP (프록시가 없는 경우)
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  return 'unknown'
}

// Rate Limit 검증
export function validateRateLimit(
  request: NextRequest,
  endpoint: string
): { allowed: boolean; error?: string; status?: number; remaining?: number; resetTime?: number } {
  // 설정이 없는 엔드포인트는 제한 없음
  const config = RATE_LIMIT_CONFIGS[endpoint]
  if (!config) {
    return { allowed: true }
  }

  // IP 주소 추출
  const clientIP = getClientIP(request)
  if (clientIP === 'unknown') {
    // IP를 추출할 수 없는 경우 보안상 요청 거부
    // 프로덕션 환경에서는 반드시 거부, 개발 환경에서는 경고 후 거부
    if (process.env.NODE_ENV === 'production') {
      console.warn('Rate limit: Unable to extract client IP, rejecting request')
      return {
        allowed: false,
        error: 'Unable to verify request origin. Please ensure proper proxy configuration.',
        status: 403
      }
    } else {
      // 개발 환경에서는 더 보수적인 제한 적용 (매우 낮은 제한)
      const devConfig = {
        maxRequests: 1, // 개발 환경에서도 최소한의 제한
        windowMs: 60 * 1000
      }
      const key = `${endpoint}:unknown`
      const now = Date.now()
      let record = rateLimitStore.get(key)
      
      if (!record || record.resetTime < now) {
        record = {
          count: 0,
          resetTime: now + devConfig.windowMs,
        }
        rateLimitStore.set(key, record)
      }
      
      record.count++
      
      if (record.count > devConfig.maxRequests) {
        return {
          allowed: false,
          error: 'Rate limit exceeded (unknown IP). Please configure proper proxy headers.',
          status: 429,
          remaining: 0,
          resetTime: record.resetTime,
        }
      }
      
      return {
        allowed: true,
        remaining: Math.max(0, devConfig.maxRequests - record.count),
        resetTime: record.resetTime,
      }
    }
  }

  // Rate Limit 키 생성 (IP + 엔드포인트)
  const key = `${endpoint}:${clientIP}`
  const now = Date.now()

  // 기존 레코드 가져오기
  let record = rateLimitStore.get(key)

  // 레코드가 없거나 만료된 경우 새로 생성
  if (!record || record.resetTime < now) {
    record = {
      count: 0,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, record)
  }

  // 요청 수 증가
  record.count++

  // 제한 초과 확인
  if (record.count > config.maxRequests) {
    const remaining = 0
    const resetTime = record.resetTime
    const retryAfter = Math.ceil((resetTime - now) / 1000)

    return {
      allowed: false,
      error: `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds. Please try again after ${retryAfter} seconds.`,
      status: 429,
      remaining,
      resetTime,
    }
  }

  // 허용됨
  const remaining = Math.max(0, config.maxRequests - record.count)
  return {
    allowed: true,
    remaining,
    resetTime: record.resetTime,
  }
}

// Rate Limit 헤더 추가 (표준 Rate Limit 헤더)
export function addRateLimitHeaders(
  response: Response,
  validation: { remaining?: number; resetTime?: number }
): void {
  if (validation.remaining !== undefined) {
    response.headers.set('X-RateLimit-Remaining', validation.remaining.toString())
  }
  if (validation.resetTime !== undefined) {
    response.headers.set('X-RateLimit-Reset', Math.ceil(validation.resetTime / 1000).toString())
  }
}
