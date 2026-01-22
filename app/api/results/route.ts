import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateRateLimit } from '@/lib/rate-limit'

// 관리자 API 키 검증
function validateAdminApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-Admin-API-Key')
  const validApiKey = process.env.ADMIN_API_KEY

  // API 키가 설정되지 않은 경우
  if (!validApiKey) {
    // 프로덕션 환경에서는 반드시 API 키가 필요
    if (process.env.NODE_ENV === 'production') {
      console.error('Error: ADMIN_API_KEY is not set in production. Admin API is blocked.')
      return false
    }
    
    // 개발 환경에서도 경고하고 거부 (보안 강화)
    // 개발 환경에서 테스트하려면 반드시 ADMIN_API_KEY를 설정해야 함
    console.warn('Warning: ADMIN_API_KEY is not set. Admin API access is denied.')
    console.warn('To enable admin API access, set ADMIN_API_KEY in .env.local')
    return false
  }

  // API 키가 설정된 경우 검증
  if (!apiKey) {
    return false
  }

  return apiKey === validApiKey
}

export async function GET(request: NextRequest) {
  // Rate limit 검증
  const rateLimitValidation = validateRateLimit(request, 'results')
  if (!rateLimitValidation.allowed) {
    return NextResponse.json(
      { error: rateLimitValidation.error || 'Rate limit exceeded' },
      { status: rateLimitValidation.status || 429 }
    )
  }

  // 관리자 API 키 검증
  if (!validateAdminApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Valid API key required.' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    // Query Parameter 검증 및 정규화
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    
    // limit 검증 (1-1000 사이, 기본값 100)
    let limit = 100
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        return NextResponse.json(
          { error: 'Invalid limit parameter. Must be between 1 and 1000.' },
          { status: 400 }
        )
      }
      limit = parsedLimit
    }
    
    // offset 검증 (0 이상, 기본값 0)
    let offset = 0
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10)
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return NextResponse.json(
          { error: 'Invalid offset parameter. Must be 0 or greater.' },
          { status: 400 }
        )
      }
      offset = parsedOffset
    }
    
    // sessionId 검증 (있는 경우)
    if (sessionId && sessionId.length > 100) {
      return NextResponse.json(
        { error: 'Invalid sessionId parameter. Too long.' },
        { status: 400 }
      )
    }

    // 이탈 정보 조회 요청 확인
    if (searchParams.get('type') === 'dropouts') {
      const { data: dropouts, error: dropoutsError } = await supabaseAdmin
        .from('user_dropouts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (dropoutsError) {
        return NextResponse.json(
          { error: 'Failed to fetch dropouts' },
          { status: 500 }
        )
      }

      return NextResponse.json(dropouts)
    }

    // 이탈 세션의 로그 조회
    if (sessionId && searchParams.get('type') === 'logs') {
      const { data: logs, error: logsError } = await supabaseAdmin
        .from('user_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('question_id', { ascending: true })

      if (logsError) {
        return NextResponse.json(
          { error: 'Failed to fetch logs' },
          { status: 500 }
        )
      }

      return NextResponse.json(logs || [])
    }

    if (sessionId) {
      // 특정 세션의 결과 조회
      const { data: testResult, error: testResultError } = await supabaseAdmin
        .from('test_results')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (testResultError) {
        return NextResponse.json(
          { error: 'Test result not found' },
          { status: 404 }
        )
      }

      const { data: logs, error: logsError } = await supabaseAdmin
        .from('user_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('question_id', { ascending: true })

      if (logsError) {
        return NextResponse.json(
          { error: 'Failed to fetch logs' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        testResult,
        logs
      })
    } else {
      // 모든 결과 조회 (관리자 페이지용)
      const { data: testResults, error: testResultsError } = await supabaseAdmin
        .from('test_results')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (testResultsError) {
        return NextResponse.json(
          { error: 'Failed to fetch test results' },
          { status: 500 }
        )
      }

      // 각 테스트 결과의 로그도 함께 가져오기
      const resultsWithLogs = await Promise.all(
        testResults.map(async (result) => {
          const { data: logs } = await supabaseAdmin
            .from('user_logs')
            .select('*')
            .eq('session_id', result.session_id)
            .order('question_id', { ascending: true })

          return {
            ...result,
            logs: logs || []
          }
        })
      )

      return NextResponse.json(resultsWithLogs)
    }
  } catch (error) {
    console.error('Error in results API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
