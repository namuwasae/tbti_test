import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  validateSessionId,
  validateTravelImageFilename,
  validateRating,
  validateThinkingTime,
  validateGender,
  validateAgeGroup,
  validateRegion,
  validateStringLength,
  parseRequestBodyWithSizeLimit
} from '@/lib/validation'
import { validateCSRFToken } from '@/lib/csrf'
import { validateRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate Limit 검증
  const rateLimitValidation = validateRateLimit(request, 'travel-rating')
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
    const { sessionId, imageFilename, rating, thinkingTimeSeconds, testResultId, gender, ageGroup, region } = body

    // 입력 검증 시작
    // 1. 필수 필드 검증
    if (!sessionId || !imageFilename || !rating) {
      return NextResponse.json(
        { error: 'Session ID, image filename, and rating are required' },
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

    // 3. 이미지 파일명 검증
    if (!validateTravelImageFilename(imageFilename)) {
      return NextResponse.json(
        { error: 'Invalid image filename' },
        { status: 400 }
      )
    }

    // 4. 평가 값 검증
    if (!validateRating(rating)) {
      return NextResponse.json(
        { error: 'Rating must be either "good" or "soso"' },
        { status: 400 }
      )
    }

    // 5. thinkingTime 검증
    const thinkingTimeValidation = validateThinkingTime(thinkingTimeSeconds)
    if (!thinkingTimeValidation.valid) {
      return NextResponse.json(
        { error: thinkingTimeValidation.error },
        { status: 400 }
      )
    }
    const thinkingTime = thinkingTimeValidation.value

    // 6. testResultId 검증 (있는 경우)
    if (testResultId !== undefined && testResultId !== null) {
      const idValidation = validateStringLength(testResultId, 100, 'testResultId')
      if (!idValidation.valid) {
        return NextResponse.json(
          { error: idValidation.error },
          { status: 400 }
        )
      }
    }

    // 7. 사용자 정보 검증
    if (!validateGender(gender)) {
      return NextResponse.json(
        { error: 'Invalid gender value' },
        { status: 400 }
      )
    }

    if (!validateAgeGroup(ageGroup)) {
      return NextResponse.json(
        { error: 'Invalid age group value' },
        { status: 400 }
      )
    }

    if (!validateRegion(region)) {
      return NextResponse.json(
        { error: 'Invalid region value' },
        { status: 400 }
      )
    }

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

    const response = NextResponse.json({ 
      success: true,
      id: data.id 
    })
    
    // Rate Limit 헤더 추가
    addRateLimitHeaders(response, rateLimitValidation)
    
    return response
  } catch (error) {
    console.error('Error in travel rating API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
