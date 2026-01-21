import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, imageFilename, rating, thinkingTimeSeconds, testResultId, gender, ageGroup, region } = body

    // 입력 검증
    if (!sessionId || !imageFilename || !rating) {
      return NextResponse.json(
        { error: 'Session ID, image filename, and rating are required' },
        { status: 400 }
      )
    }

    // rating 값 검증 ('good' 또는 'soso'만 허용)
    if (rating !== 'good' && rating !== 'soso') {
      return NextResponse.json(
        { error: 'Rating must be either "good" or "soso"' },
        { status: 400 }
      )
    }

    // thinkingTimeSeconds 검증 및 기본값 설정
    const thinkingTime = thinkingTimeSeconds !== undefined && thinkingTimeSeconds !== null 
      ? parseFloat(thinkingTimeSeconds) 
      : 0

    // 여행지 사진 평가 저장
    const { data, error } = await supabaseAdmin
      .from('travel_image_ratings')
      .insert({
        test_result_id: testResultId || null,
        session_id: sessionId,
        image_filename: imageFilename,
        rating: rating,
        thinking_time_seconds: thinkingTime,
        gender: gender || null,
        age_group: ageGroup || null,
        region: region || null,
        email: null // 이메일은 나중에 입력될 수 있음
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving travel image rating:', error)
      return NextResponse.json(
        { error: 'Failed to save travel image rating' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      id: data.id 
    })
  } catch (error) {
    console.error('Error in travel rating API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
