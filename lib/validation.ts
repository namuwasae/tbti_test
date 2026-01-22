import questionsData from '@/test.json'

// 허용된 성별 값
const ALLOWED_GENDERS = ['Male', 'Female', 'Prefer not to answer']

// 허용된 나이대 값
const ALLOWED_AGE_GROUPS = ['10s', '20s', '30s', '40s', '50s', '60+']

// 허용된 지역 값
const ALLOWED_REGIONS = [
  'East Asia (Korea, Japan, China, etc.)',
  'Southeast Asia (Vietnam, Thailand, Indonesia, etc.)',
  'Europe',
  'North America (USA, Canada)',
  'Latin America',
  'Oceania',
  'Middle East',
  'Africa',
  'Other'
]

// 허용된 여행지 이미지 파일명
const ALLOWED_TRAVEL_IMAGES = [
  '01_gyeongbokgung.jpg',
  '02_namsantower.jpg',
  '03_cheongGyeCheon.jpg',
  '04_lotteWorld.jpg',
  '05_NationalMuseumOfKorea.jpg',
  '06_HongdaeStreet.jpg',
  '07_bukchonHanokVillage.jpg',
  '08_ikseondong.jpg',
  '09_bukhanMountain.jpg',
  '10_coex.jpg',
  '11_gwangjangMarket.JPG',
  '12_DDP(DongdaemunDesignPlaza).jpg',
  '13_leeumMuseumOfArt.jpg',
  '14_insadong.jpg',
  '15_SeoulForest.jpg',
  '16_k-star_road.jpg',
  '17_bongEunSaTemple.jpg'
]

// 실제 질문 데이터 (서버 사이드에서 사용)
const VALID_QUESTIONS = questionsData as Array<{
  id: number
  question: string
  type: 'single' | 'multiple'
  maxSelections?: number
  options: string[]
}>

// 세션 ID 형식 검증 (session_UUID 형식)
// 서버에서 생성한 암호학적으로 안전한 UUID v4 형식
export function validateSessionId(sessionId: any): boolean {
  if (typeof sessionId !== 'string') return false
  if (sessionId.length < 37 || sessionId.length > 50) return false // session_ + UUID (36 chars) = 최소 37
  if (!sessionId.startsWith('session_')) return false
  
  // UUID v4 형식 검증 (8-4-4-4-12 hex digits)
  const uuidPart = sessionId.substring(8) // 'session_' 제거
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuidPart)
}

// 질문 데이터 무결성 검증
export function validateQuestions(questions: any): { valid: boolean; error?: string } {
  if (!Array.isArray(questions)) {
    return { valid: false, error: 'Questions must be an array' }
  }

  if (questions.length !== VALID_QUESTIONS.length) {
    return { valid: false, error: `Expected ${VALID_QUESTIONS.length} questions, got ${questions.length}` }
  }

  // 각 질문이 실제 질문과 일치하는지 검증
  for (const submittedQuestion of questions) {
    if (typeof submittedQuestion !== 'object' || submittedQuestion === null) {
      return { valid: false, error: 'Invalid question object' }
    }

    const { id, question, type, options } = submittedQuestion

    // ID 검증
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
      return { valid: false, error: `Invalid question ID: ${id}` }
    }

    // 실제 질문 데이터와 비교
    const validQuestion = VALID_QUESTIONS.find(q => q.id === id)
    if (!validQuestion) {
      return { valid: false, error: `Question ID ${id} does not exist` }
    }

    // 질문 텍스트 일치 확인
    if (typeof question !== 'string' || question !== validQuestion.question) {
      return { valid: false, error: `Question text mismatch for ID ${id}` }
    }

    // 타입 검증
    if (type !== 'single' && type !== 'multiple') {
      return { valid: false, error: `Invalid question type for ID ${id}: ${type}` }
    }

    if (type !== validQuestion.type) {
      return { valid: false, error: `Question type mismatch for ID ${id}` }
    }

    // 옵션 검증
    if (!Array.isArray(options)) {
      return { valid: false, error: `Options must be an array for question ID ${id}` }
    }

    if (options.length !== validQuestion.options.length) {
      return { valid: false, error: `Options count mismatch for question ID ${id}` }
    }

    // 각 옵션 텍스트 일치 확인
    for (let i = 0; i < options.length; i++) {
      if (typeof options[i] !== 'string' || options[i] !== validQuestion.options[i]) {
        return { valid: false, error: `Option text mismatch for question ID ${id}, option ${i}` }
      }
    }
  }

  return { valid: true }
}

// 답변 데이터 검증
// 주의: 이 함수는 text 설문(12개 질문)의 답변만 검증합니다.
// Image 설문(17개 이미지)은 별도의 /api/travel-rating 엔드포인트에서 처리됩니다.
export function validateAnswers(answers: any, questions: any[]): { valid: boolean; error?: string } {
  if (!Array.isArray(answers)) {
    return { valid: false, error: 'Answers must be an array' }
  }

  // 답변 개수가 질문 개수를 초과하지 않도록
  // text 설문은 12개 질문이므로 답변도 최대 12개여야 합니다.
  // (각 질문당 1개의 답변 객체, 다중 선택의 경우 answer.answers 배열에 여러 인덱스 포함)
  if (answers.length > questions.length) {
    return { valid: false, error: `Too many answers: ${answers.length} > ${questions.length}` }
  }

  // 각 답변 검증
  for (const answer of answers) {
    if (typeof answer !== 'object' || answer === null) {
      return { valid: false, error: 'Invalid answer object' }
    }

    const { questionId, answers: answerIndices, thinkingTime } = answer

    // questionId 검증
    if (typeof questionId !== 'number' || !Number.isInteger(questionId) || questionId < 1) {
      return { valid: false, error: `Invalid questionId: ${questionId}` }
    }

    // 해당 질문이 존재하는지 확인
    const question = questions.find(q => q.id === questionId)
    if (!question) {
      return { valid: false, error: `Question ID ${questionId} not found in questions array` }
    }

    // answerIndices 검증
    if (!Array.isArray(answerIndices)) {
      return { valid: false, error: `Answers must be an array for questionId ${questionId}` }
    }

    // 단일 선택인 경우 1개만 허용
    if (question.type === 'single' && answerIndices.length !== 1) {
      return { valid: false, error: `Single choice question ${questionId} must have exactly 1 answer` }
    }

    // 다중 선택인 경우 maxSelections 제한 확인
    if (question.type === 'multiple') {
      const maxSelections = question.maxSelections || 3
      if (answerIndices.length > maxSelections) {
        return { valid: false, error: `Question ${questionId} exceeds max selections (${maxSelections})` }
      }
      if (answerIndices.length === 0) {
        return { valid: false, error: `Question ${questionId} requires at least 1 answer` }
      }
    }

    // 각 답변 인덱스 검증
    for (const index of answerIndices) {
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
        return { valid: false, error: `Invalid answer index: ${index} for questionId ${questionId}` }
      }
      if (index >= question.options.length) {
        return { valid: false, error: `Answer index ${index} out of range for questionId ${questionId}` }
      }
    }

    // thinkingTime 검증
    if (thinkingTime !== undefined && thinkingTime !== null) {
      if (typeof thinkingTime !== 'number' || thinkingTime < 0 || thinkingTime > 3600) {
        return { valid: false, error: `Invalid thinkingTime: ${thinkingTime} for questionId ${questionId}` }
      }
    }
  }

  return { valid: true }
}

// 성별 검증
export function validateGender(gender: any): boolean {
  if (gender === null || gender === undefined) return true // null 허용
  return typeof gender === 'string' && ALLOWED_GENDERS.includes(gender)
}

// 나이대 검증
export function validateAgeGroup(ageGroup: any): boolean {
  if (ageGroup === null || ageGroup === undefined) return true // null 허용
  return typeof ageGroup === 'string' && ALLOWED_AGE_GROUPS.includes(ageGroup)
}

// 지역 검증
export function validateRegion(region: any): boolean {
  if (region === null || region === undefined) return true // null 허용
  return typeof region === 'string' && ALLOWED_REGIONS.includes(region)
}

// 이메일 검증 (RFC 5321 준수)
export function validateEmail(email: any): { valid: boolean; error?: string } {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' }
  }

  // 빈 문자열 또는 공백만 있는 경우
  const trimmedEmail = email.trim()
  if (trimmedEmail.length === 0) {
    return { valid: false, error: 'Email cannot be empty' }
  }

  // 전체 길이 검증 (RFC 5321: 최대 254자)
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email is too long (max 254 characters)' }
  }

  // 최소 길이 검증 (예: a@b.co = 6자)
  if (trimmedEmail.length < 6) {
    return { valid: false, error: 'Email is too short (minimum 6 characters)' }
  }

  // @ 기호가 정확히 하나인지 확인
  const atCount = (trimmedEmail.match(/@/g) || []).length
  if (atCount !== 1) {
    return { valid: false, error: 'Email must contain exactly one @ symbol' }
  }

  // 로컬 파트와 도메인 파트 분리
  const [localPart, domainPart] = trimmedEmail.split('@')

  // 로컬 파트 검증 (RFC 5321: 최대 64자, 최소 1자)
  if (!localPart || localPart.length === 0) {
    return { valid: false, error: 'Email local part cannot be empty' }
  }
  if (localPart.length > 64) {
    return { valid: false, error: 'Email local part is too long (max 64 characters)' }
  }

  // 도메인 파트 검증 (RFC 5321: 최대 255자, 최소 4자 - 예: a.co)
  if (!domainPart || domainPart.length === 0) {
    return { valid: false, error: 'Email domain part cannot be empty' }
  }
  if (domainPart.length > 255) {
    return { valid: false, error: 'Email domain part is too long (max 255 characters)' }
  }
  if (domainPart.length < 4) {
    return { valid: false, error: 'Email domain part is too short (minimum 4 characters, e.g., a.co)' }
  }

  // 전체 길이 재검증 (로컬 파트 + @ + 도메인 파트 = 전체 길이)
  // 로컬 파트(64) + @(1) + 도메인 파트(255) = 320이지만, 전체는 254자 제한
  // 따라서 실제로는 더 작아야 함
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email is too long (max 254 characters)' }
  }

  // 기본 이메일 형식 검증 (TLD는 최소 2자 이상)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // 도메인 파트에 점(.)이 있는지 확인 (TLD 포함)
  if (!domainPart.includes('.')) {
    return { valid: false, error: 'Email domain must contain a top-level domain (e.g., .com, .co)' }
  }

  // 도메인 파트의 마지막 부분(TLD)이 최소 2자인지 확인
  const domainParts = domainPart.split('.')
  const tld = domainParts[domainParts.length - 1]
  if (!tld || tld.length < 2) {
    return { valid: false, error: 'Email top-level domain must be at least 2 characters' }
  }

  return { valid: true }
}

// 여행지 이미지 파일명 검증
export function validateTravelImageFilename(filename: any): boolean {
  if (typeof filename !== 'string') return false
  return ALLOWED_TRAVEL_IMAGES.includes(filename)
}

// 평가 값 검증
export function validateRating(rating: any): boolean {
  return rating === 'good' || rating === 'soso'
}

// thinkingTime 검증 (초 단위)
export function validateThinkingTime(thinkingTime: any): { valid: boolean; value: number; error?: string } {
  if (thinkingTime === undefined || thinkingTime === null) {
    return { valid: true, value: 0 }
  }

  const numValue = typeof thinkingTime === 'number' 
    ? thinkingTime 
    : parseFloat(thinkingTime)

  if (isNaN(numValue)) {
    return { valid: false, value: 0, error: 'Thinking time must be a number' }
  }

  if (numValue < 0) {
    return { valid: false, value: 0, error: 'Thinking time cannot be negative' }
  }

  if (numValue > 3600) {
    return { valid: false, value: 0, error: 'Thinking time cannot exceed 3600 seconds' }
  }

  return { valid: true, value: numValue }
}

// 숫자 범위 검증
export function validateNumberRange(value: any, min: number, max: number, fieldName: string): { valid: boolean; error?: string } {
  if (value === undefined || value === null) {
    return { valid: true }
  }

  const numValue = typeof value === 'number' ? value : parseInt(value)
  if (isNaN(numValue)) {
    return { valid: false, error: `${fieldName} must be a number` }
  }

  if (numValue < min || numValue > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` }
  }

  return { valid: true }
}

// 문자열 길이 검증
export function validateStringLength(value: any, maxLength: number, fieldName: string): { valid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { valid: true }
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` }
  }

  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} is too long (max ${maxLength} characters)` }
  }

  return { valid: true }
}

// 요청 본문 크기 제한 (설문조사 데이터용)
// 설문조사 데이터는 작지만 DoS 공격 방지를 위해 제한 필요
const MAX_BODY_SIZE = 100 * 1024 // 100KB

/**
 * 요청 본문 크기를 검증하고 JSON으로 파싱합니다.
 * @param request NextRequest 객체
 * @returns { body: any, error?: string } 파싱된 본문 또는 에러 메시지
 */
export async function parseRequestBodyWithSizeLimit(
  request: NextRequest
): Promise<{ body?: any; error?: string }> {
  try {
    // 1. Content-Length 헤더 확인 (있는 경우)
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (isNaN(size) || size < 0) {
        return { error: 'Invalid Content-Length header' }
      }
      if (size > MAX_BODY_SIZE) {
        return { 
          error: `Request body too large: ${size} bytes (max ${MAX_BODY_SIZE} bytes)` 
        }
      }
    }

    // 2. 본문을 텍스트로 읽어서 크기 확인
    const text = await request.text()
    const bodySize = Buffer.byteLength(text, 'utf8')
    
    if (bodySize > MAX_BODY_SIZE) {
      return { 
        error: `Request body too large: ${bodySize} bytes (max ${MAX_BODY_SIZE} bytes)` 
      }
    }

    // 3. JSON 파싱
    try {
      const body = JSON.parse(text)
      return { body }
    } catch (parseError) {
      return { error: 'Invalid JSON format' }
    }
  } catch (error) {
    console.error('Error parsing request body:', error)
    return { error: 'Failed to parse request body' }
  }
}
