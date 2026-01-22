import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  validateSessionId,
  validateTravelImageFilename,
  validateGender,
  validateAgeGroup,
  validateRegion,
  validateNumberRange,
  validateStringLength,
  parseRequestBodyWithSizeLimit
} from '@/lib/validation'
import { validateCSRFToken } from '@/lib/csrf'
import { validateRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate Limit 검증
  const rateLimitValidation = validateRateLimit(request, 'travel-dropout')
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

    // 입력 검증 시작
    // 1. 필수 필드 검증
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
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

    // 3. testResultId 검증 (있는 경우)
    if (testResultId !== undefined && testResultId !== null) {
      const idValidation = validateStringLength(testResultId, 100, 'testResultId')
      if (!idValidation.valid) {
        return NextResponse.json(
          { error: idValidation.error },
          { status: 400 }
        )
      }
    }

    // 4. 이미지 파일명 검증 (있는 경우)
    if (imageFilename !== undefined && imageFilename !== null) {
      if (!validateTravelImageFilename(imageFilename)) {
        return NextResponse.json(
          { error: 'Invalid image filename' },
          { status: 400 }
        )
      }
    }

    // 5. 숫자 필드 검증
    if (currentImageIndex !== undefined && currentImageIndex !== null) {
      const indexValidation = validateNumberRange(currentImageIndex, 0, 100, 'currentImageIndex')
      if (!indexValidation.valid) {
        return NextResponse.json(
          { error: indexValidation.error },
          { status: 400 }
        )
      }
    }

    if (totalImages !== undefined && totalImages !== null) {
      const totalValidation = validateNumberRange(totalImages, 1, 100, 'totalImages')
      if (!totalValidation.valid) {
        return NextResponse.json(
          { error: totalValidation.error },
          { status: 400 }
        )
      }
    }

    if (completedImages !== undefined && completedImages !== null) {
      const completedValidation = validateNumberRange(completedImages, 0, 100, 'completedImages')
      if (!completedValidation.valid) {
        return NextResponse.json(
          { error: completedValidation.error },
          { status: 400 }
        )
      }
    }

    if (timeSpent !== undefined && timeSpent !== null) {
      const timeValidation = validateNumberRange(timeSpent, 0, 86400, 'timeSpent') // 최대 24시간
      if (!timeValidation.valid) {
        return NextResponse.json(
          { error: timeValidation.error },
          { status: 400 }
        )
      }
    }

    // 6. completedRatings 검증 (있는 경우 - 배열이어야 함)
    if (completedRatings !== undefined && completedRatings !== null) {
      if (!Array.isArray(completedRatings)) {
        return NextResponse.json(
          { error: 'completedRatings must be an array' },
          { status: 400 }
        )
      }

      // 배열 크기 제한
      if (completedRatings.length > 100) {
        return NextResponse.json(
          { error: 'completedRatings array is too large (max 100 items)' },
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

    const response = NextResponse.json({ success: true })
    
    // Rate Limit 헤더 추가
    addRateLimitHeaders(response, rateLimitValidation)
    
    return response
  } catch (error) {
    console.error('Error in travel dropout API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
