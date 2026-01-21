import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

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
