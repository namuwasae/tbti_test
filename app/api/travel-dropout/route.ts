import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sessionId, 
      testResultId,
      imageFilename,
      currentImageIndex,
      totalImages,
      completedImages,
      timeSpent,
      completedRatings, // 완료한 평가들 (이전까지 선택한 평가와 시간)
      gender,
      ageGroup,
      region
    } = body

    // IP 주소와 User-Agent 추출
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // 사진 설문 이탈 정보 저장
    const { data: dropoutData, error: dropoutError } = await supabaseAdmin
      .from('travel_image_dropouts')
      .insert({
        test_result_id: testResultId || null,
        session_id: sessionId,
        user_agent: userAgent,
        ip_address: ipAddress,
        gender: gender || null,
        age_group: ageGroup || null,
        region: region || null,
        image_filename: imageFilename || null,
        current_image_index: currentImageIndex || 0,
        total_images: totalImages || 0,
        completed_images: completedImages || 0,
        time_spent_seconds: timeSpent || 0,
        completed_ratings: completedRatings || null, // JSONB로 저장
        email: null // 이메일은 나중에 입력될 수 있음
      })
      .select()
      .single()

    if (dropoutError) {
      console.error('Error saving travel image dropout:', dropoutError)
      return NextResponse.json(
        { error: 'Failed to save travel image dropout' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in travel dropout API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
