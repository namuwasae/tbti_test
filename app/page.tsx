'use client'

import { useState, useEffect, useRef } from 'react'
import questionsData from '@/test.json'

interface Question {
  id: number
  question: string
  type: 'single' | 'multiple'
  maxSelections?: number
  options: string[]
}

interface Answer {
  questionId: number
  answers: number[]
  thinkingTime: number
}

interface UserInfo {
  gender: string
  ageGroup: string
  region: string
}

// 여행지 사진 목록
const travelImages = [
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

// 여행지 사진 파일명과 장소 이름 매핑
const travelImageNames: Record<string, string> = {
  '01_gyeongbokgung.jpg': 'Gyeongbokgung',
  '02_namsantower.jpg': 'NamsanTower',
  '03_cheongGyeCheon.jpg': 'CheongGyeCheon',
  '04_lotteWorld.jpg': 'LotteWorld',
  '05_NationalMuseumOfKorea.jpg': 'NationalMuseumOfKorea',
  '06_HongdaeStreet.jpg': 'HongdaeStreet',
  '07_bukchonHanokVillage.jpg': 'BukchonHanokVillage',
  '08_ikseondong.jpg': 'Ikseondong',
  '09_bukhanMountain.jpg': 'BukhanMountain',
  '10_coex.jpg': 'Coex',
  '11_gwangjangMarket.JPG': 'GwangjangMarket',
  '12_DDP(DongdaemunDesignPlaza).jpg': 'DDP(DongdaemunDesignPlaza)',
  '13_leeumMuseumOfArt.jpg': 'LeeumMuseumOfArt',
  '14_insadong.jpg': 'Insadong',
  '15_SeoulForest.jpg': 'SeoulForest',
  '16_k-star_road.jpg': 'K-star_road',
  '17_bongEunSaTemple.jpg': 'BongeunSaTemple'
}

export default function Home() {
  const [questions] = useState<Question[]>(questionsData as Question[])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [showUserInfoForm, setShowUserInfoForm] = useState(true)
  const [selectedGender, setSelectedGender] = useState<string>('')
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('')
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false)
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [emailError, setEmailError] = useState<string>('')
  
  // 여행지 사진 평가 관련 상태
  const [showTravelImages, setShowTravelImages] = useState(false)
  const [currentTravelImageIndex, setCurrentTravelImageIndex] = useState(0)
  const [testResultId, setTestResultId] = useState<string | null>(null)
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false)
  
  // 각 사진별 고민 시간 추적 (이전으로 갔다가 돌아와도 시간 누적)
  const [travelImageTimes, setTravelImageTimes] = useState<Map<number, number>>(new Map())
  const travelImageStartTimeRef = useRef<number>(Date.now())
  // 완료한 평가들 추적 (이미 평가 버튼을 누른 사진들)
  const [completedRatingsMap, setCompletedRatingsMap] = useState<Map<number, { rating: 'good' | 'soso', thinkingTime: number }>>(new Map())
  
  // 각 질문별 고민 시간 추적 (이전으로 갔다가 돌아와도 시간 누적)
  const [questionTimes, setQuestionTimes] = useState<Map<number, number>>(new Map())
  const questionStartTimeRef = useRef<number>(Date.now())
  const currentQuestionIdRef = useRef<number>(questions[0]?.id || 0)
  const sessionStartTimeRef = useRef<number>(Date.now())
  const previousQuestionIndexRef = useRef<number>(-1)

  useEffect(() => {
    // 질문이 변경될 때 시간 추적
    if (!userInfo || showUserInfoForm) return // 사용자 정보가 없거나 폼 표시 중이면 무시
    
    const currentTime = Date.now()
    const previousIndex = previousQuestionIndexRef.current
    
    // 이전 질문이 있었다면 시간 누적
    if (previousIndex >= 0 && questionStartTimeRef.current > 0) {
      const timeSpent = (currentTime - questionStartTimeRef.current) / 1000 // 초 단위
      const previousQuestionId = questions[previousIndex]?.id
      if (previousQuestionId !== undefined) {
        setQuestionTimes(prev => {
          const newMap = new Map(prev)
          const previousTime = newMap.get(previousQuestionId) || 0
          newMap.set(previousQuestionId, previousTime + timeSpent)
          return newMap
        })
      }
    }

    // 현재 질문의 시작 시간 기록
    questionStartTimeRef.current = Date.now()
    currentQuestionIdRef.current = questions[currentQuestionIndex]?.id || 0
    // 현재 인덱스를 이전 인덱스로 저장
    previousQuestionIndexRef.current = currentQuestionIndex
  }, [currentQuestionIndex, questions, userInfo, showUserInfoForm])

  // 이전 사진 인덱스를 추적하기 위한 ref
  const previousTravelImageIndexRef = useRef<number>(-1)

  // 여행지 사진이 변경될 때 시간 추적
  useEffect(() => {
    if (!showTravelImages) return

    const currentTime = Date.now()
    const previousIndex = previousTravelImageIndexRef.current
    
    // 이전 사진이 있었다면 시간 누적
    if (previousIndex >= 0 && travelImageStartTimeRef.current > 0) {
      const timeSpent = (currentTime - travelImageStartTimeRef.current) / 1000 // 초 단위
      setTravelImageTimes(prev => {
        const newMap = new Map(prev)
        const previousTime = newMap.get(previousIndex) || 0
        newMap.set(previousIndex, previousTime + timeSpent)
        return newMap
      })
    }

    // 현재 사진의 시작 시간 기록
    travelImageStartTimeRef.current = Date.now()
    // 현재 인덱스를 이전 인덱스로 저장
    previousTravelImageIndexRef.current = currentTravelImageIndex
  }, [currentTravelImageIndex, showTravelImages])

  // text 설문 이탈 추적 (페이지 언로드 시)
  useEffect(() => {
    if (!userInfo) return // 사용자 정보가 없으면 이탈 추적하지 않음
    if (isComplete) return // 설문이 완료되었으면 이탈 추적하지 않음 (중복 로그 방지)
    if (showTravelImages) return // 사진 설문 중이면 text 설문 이탈 추적하지 않음

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 페이지를 떠나기 전에 이탈 정보 저장
      const currentQuestion = questions[currentQuestionIndex]
      const timeSpent = (Date.now() - sessionStartTimeRef.current) / 1000

      // navigator.sendBeacon을 사용하여 비동기로 전송 (페이지 종료 중에도 작동)
      // 이전 설문 기록(answers)도 함께 전송
      const data = JSON.stringify({
        sessionId,
        questionId: currentQuestion?.id || null,
        questionText: currentQuestion?.question || null,
        currentQuestionIndex,
        totalQuestions: questions.length,
        completedQuestions: answers.length,
        timeSpent,
        answers: answers, // 이전 설문 기록 추가
        questions: questions, // 질문 정보 추가 (답변 매핑용)
        gender: userInfo.gender,
        ageGroup: userInfo.ageGroup,
        region: userInfo.region
      })

      navigator.sendBeacon('/api/dropout', new Blob([data], { type: 'application/json' }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sessionId, currentQuestionIndex, questions, answers, userInfo, isComplete, showTravelImages])

  // 사진 설문 이탈 추적 (페이지 언로드 시)
  useEffect(() => {
    if (!userInfo) return // 사용자 정보가 없으면 이탈 추적하지 않음
    if (!showTravelImages) return // 사진 설문 중이 아니면 이탈 추적하지 않음

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 페이지를 떠나기 전에 사진 설문 이탈 정보 저장
      const currentImage = travelImages[currentTravelImageIndex]
      const currentTime = Date.now()
      
      // 현재 사진의 시간 계산
      let currentImageTime = travelImageTimes.get(currentTravelImageIndex) || 0
      if (travelImageStartTimeRef.current > 0) {
        const timeSpent = (currentTime - travelImageStartTimeRef.current) / 1000
        currentImageTime += timeSpent
      }
      
      // 전체 소요 시간 계산 (모든 사진의 시간 합계)
      let totalTimeSpent = 0
      travelImageTimes.forEach((time) => {
        totalTimeSpent += time
      })
      totalTimeSpent += currentImageTime
      
      // 완료한 평가들 수집 (이전까지 선택한 평가와 시간)
      const completedRatings: any[] = []
      
      // 완료한 평가들 (이미 평가 버튼을 누른 사진들)
      completedRatingsMap.forEach((ratingData, imageIndex) => {
        completedRatings.push({
          imageIndex,
          imageFilename: travelImages[imageIndex],
          rating: ratingData.rating,
          thinkingTimeSeconds: ratingData.thinkingTime,
          completed: true
        })
      })
      
      // 현재 사진도 포함 (평가 완료 전이지만 시간은 기록)
      if (currentImageTime > 0 && !completedRatingsMap.has(currentTravelImageIndex)) {
        completedRatings.push({
          imageIndex: currentTravelImageIndex,
          imageFilename: currentImage,
          thinkingTimeSeconds: currentImageTime,
          completed: false // 평가 완료 전
        })
      }
      
      // 완료한 사진 개수 계산
      const completedImagesCount = completedRatingsMap.size

      // navigator.sendBeacon을 사용하여 비동기로 전송 (페이지 종료 중에도 작동)
      const data = JSON.stringify({
        sessionId,
        testResultId: testResultId,
        imageFilename: currentImage,
        currentImageIndex: currentTravelImageIndex,
        totalImages: travelImages.length,
        completedImages: completedImagesCount, // 평가 완료한 사진 수
        timeSpent: totalTimeSpent,
        completedRatings: completedRatings, // 완료한 평가들
        gender: userInfo.gender,
        ageGroup: userInfo.ageGroup,
        region: userInfo.region
      })

      navigator.sendBeacon('/api/travel-dropout', new Blob([data], { type: 'application/json' }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sessionId, currentTravelImageIndex, travelImages, travelImageTimes, completedRatingsMap, testResultId, userInfo, showTravelImages])

  const handleOptionClick = (optionIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex]
    
    if (currentQuestion.type === 'single') {
      // 단일 선택: 클릭하면 바로 다음 질문으로
      // 현재까지 누적된 시간 계산
      const currentTime = Date.now()
      let totalTime = questionTimes.get(currentQuestion.id) || 0
      if (questionStartTimeRef.current > 0) {
        const timeSpent = (currentTime - questionStartTimeRef.current) / 1000 // 초 단위
        totalTime += timeSpent
      }
      
      // 시간을 누적 시간에 저장
      setQuestionTimes(prev => {
        const newMap = new Map(prev)
        newMap.set(currentQuestion.id, totalTime)
        return newMap
      })
      
      const isLastQuestion = currentQuestionIndex === questions.length - 1
      
      if (isLastQuestion) {
        // 마지막 질문이면 현재 답변을 포함하여 바로 제출
        const finalAnswer = {
          questionId: currentQuestion.id,
          answers: [optionIndex],
          thinkingTime: totalTime
        }
        setAnswers(prev => [...prev, finalAnswer])
        // 최신 답변을 포함하여 제출
        submitTest(finalAnswer)
      } else {
        saveAnswer(currentQuestion.id, [optionIndex], totalTime)
        moveToNextQuestion()
      }
    } else {
      // 다중 선택: 선택/해제만 수행
      setSelectedOptions(prev => {
        if (prev.includes(optionIndex)) {
          return prev.filter(idx => idx !== optionIndex)
        } else {
          const maxSelections = currentQuestion.maxSelections || 3
          if (prev.length >= maxSelections) {
            return prev
          }
          return [...prev, optionIndex]
        }
      })
    }
  }

  const handleNext = () => {
    if (selectedOptions.length === 0) return
    
    const currentQuestion = questions[currentQuestionIndex]
    
    // 현재까지 누적된 시간 계산
    const currentTime = Date.now()
    let totalTime = questionTimes.get(currentQuestion.id) || 0
    if (questionStartTimeRef.current > 0) {
      const timeSpent = (currentTime - questionStartTimeRef.current) / 1000 // 초 단위
      totalTime += timeSpent
    }
    
    // 시간을 누적 시간에 저장
    setQuestionTimes(prev => {
      const newMap = new Map(prev)
      newMap.set(currentQuestion.id, totalTime)
      return newMap
    })
    
    const isLastQuestion = currentQuestionIndex === questions.length - 1
    
    if (isLastQuestion) {
      // 마지막 질문이면 현재 답변을 포함하여 바로 제출
      const finalAnswer = {
        questionId: currentQuestion.id,
        answers: selectedOptions,
        thinkingTime: totalTime
      }
      setAnswers(prev => [...prev, finalAnswer])
      // 최신 답변을 포함하여 제출
      submitTest(finalAnswer)
    } else {
      saveAnswer(currentQuestion.id, selectedOptions, totalTime)
      moveToNextQuestion()
    }
  }

  const saveAnswer = (questionId: number, answerIndices: number[], thinkingTime: number) => {
    setAnswers(prev => [...prev, {
      questionId,
      answers: answerIndices,
      thinkingTime
    }])
  }

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedOptions([])
    } else {
      // 모든 질문 완료
      submitTest()
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      // 현재 질문의 시간을 먼저 저장
      const currentTime = Date.now()
      const currentQuestionId = questions[currentQuestionIndex]?.id
      if (currentQuestionId !== undefined && questionStartTimeRef.current > 0) {
        const timeSpent = (currentTime - questionStartTimeRef.current) / 1000 // 초 단위
        setQuestionTimes(prev => {
          const newMap = new Map(prev)
          const previousTime = newMap.get(currentQuestionId) || 0
          newMap.set(currentQuestionId, previousTime + timeSpent)
          return newMap
        })
      }

      // 이전 질문 인덱스
      const prevIndex = currentQuestionIndex - 1
      const prevQuestion = questions[prevIndex]
      
      // 마지막 답변을 먼저 가져옴 (제거하기 전)
      const prevAnswer = answers.length > 0 ? answers[answers.length - 1] : null
      
      // 마지막 답변 제거
      setAnswers(prev => prev.slice(0, -1))
      
      // 이전 질문으로 이동
      setCurrentQuestionIndex(prevIndex)
      
      // 이전 질문의 시작 시간 기록
      questionStartTimeRef.current = Date.now()
      
      // 이전 질문의 답변 복원
      if (prevAnswer && prevAnswer.questionId === prevQuestion.id) {
        setSelectedOptions(prevAnswer.answers)
      } else {
        setSelectedOptions([])
      }
    }
  }

  const handleUserInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedGender || !selectedAgeGroup || !selectedRegion) {
      alert('Please fill in all fields.')
      return
    }
    
    const info: UserInfo = {
      gender: selectedGender,
      ageGroup: selectedAgeGroup,
      region: selectedRegion
    }
    
    setUserInfo(info)
    setShowUserInfoForm(false)
  }

  const submitTest = async (additionalAnswer?: Answer) => {
    if (!userInfo) return
    
    setIsSubmitting(true)
    
    try {
      // 추가 답변이 있으면 포함하여 제출
      const answersToSubmit = additionalAnswer 
        ? [...answers, additionalAnswer]
        : answers
      
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          answers: answersToSubmit,
          questions,
          gender: userInfo.gender,
          ageGroup: userInfo.ageGroup,
          region: userInfo.region
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTestResultId(data.testResultId)
        setIsComplete(true)
        setShowTravelImages(true) // 설문 완료 후 여행지 사진 평가 시작
        // 첫 번째 사진의 시작 시간 기록
        travelImageStartTimeRef.current = Date.now()
      } else {
        console.error('Failed to submit test')
        alert('테스트 제출에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('Error submitting test:', error)
      alert('테스트 제출 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 사용자 정보 입력 폼
  if (showUserInfoForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-2xl w-full mx-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
            Welcome to the Test
          </h1>
          <p className="text-gray-600 mb-6 text-center">
            Please provide some information before starting the test.
          </p>
          
          <form onSubmit={handleUserInfoSubmit} className="space-y-6">
            {/* 성별 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Gender
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Male', 'Female', 'Prefer not to answer'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedGender === option
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      className="sr-only"
                      checked={selectedGender === option}
                      onChange={(e) => setSelectedGender(e.target.value)}
                      required
                    />
                    <span className={`text-sm font-medium ${
                      selectedGender === option ? 'text-indigo-900 font-semibold' : 'text-gray-700'
                    }`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 나이대 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Age Group
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {['10s', '20s', '30s', '40s', '50s', '60+'].map((age) => (
                  <label
                    key={age}
                    className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAgeGroup === age
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ageGroup"
                      value={age}
                      className="sr-only"
                      checked={selectedAgeGroup === age}
                      onChange={(e) => setSelectedAgeGroup(e.target.value)}
                      required
                    />
                    <span className={`text-sm font-medium ${
                      selectedAgeGroup === age ? 'text-indigo-900 font-semibold' : 'text-gray-700'
                    }`}>
                      {age}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 출신권역 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Which region best describes your background?
              </label>
              <div className="space-y-2">
                {[
                  'East Asia (Korea, Japan, China, etc.)',
                  'Southeast Asia (Vietnam, Thailand, Indonesia, etc.)',
                  'Europe',
                  'North America (USA, Canada)',
                  'Latin America',
                  'Oceania',
                  'Middle East',
                  'Africa',
                  'Other'
                ].map((region) => (
                  <label
                    key={region}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRegion === region
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="region"
                      value={region}
                      className="sr-only"
                      checked={selectedRegion === region}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      required
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 ${
                      selectedRegion === region
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedRegion === region && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      selectedRegion === region ? 'text-indigo-900 font-semibold' : 'text-gray-700'
                    }`}>
                      {region}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-base"
            >
              Start Test
            </button>
          </form>
        </div>
      </div>
    )
  }

  const handleTravelImagePrevious = () => {
    // 현재 사진의 시간을 먼저 저장
    const currentTime = Date.now()
    if (travelImageStartTimeRef.current > 0) {
      const timeSpent = (currentTime - travelImageStartTimeRef.current) / 1000 // 초 단위
      setTravelImageTimes(prev => {
        const newMap = new Map(prev)
        const previousTime = newMap.get(currentTravelImageIndex) || 0
        newMap.set(currentTravelImageIndex, previousTime + timeSpent)
        return newMap
      })
    }

    if (currentTravelImageIndex > 0) {
      // 이전 사진으로 이동
      setCurrentTravelImageIndex(prev => prev - 1)
      // 이전 사진의 시작 시간 기록
      travelImageStartTimeRef.current = Date.now()
    } else {
      // 첫 번째 사진일 때는 설문조사 마지막 문항으로 돌아가기
      setShowTravelImages(false)
      setIsComplete(false)
      // 마지막 질문 인덱스로 설정
      setCurrentQuestionIndex(questions.length - 1)
      // 마지막 질문의 답변 복원 (있는 경우)
      const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null
      if (lastAnswer && lastAnswer.questionId === questions[questions.length - 1]?.id) {
        setSelectedOptions(lastAnswer.answers)
      } else {
        setSelectedOptions([])
      }
    }
  }

  const handleTravelImageRating = async (rating: 'good' | 'soso') => {
    if (!userInfo || isRatingSubmitting) return
    
    setIsRatingSubmitting(true)
    
    try {
      const currentImage = travelImages[currentTravelImageIndex]
      
      // 현재까지 누적된 시간 계산
      const currentTime = Date.now()
      let totalTime = travelImageTimes.get(currentTravelImageIndex) || 0
      
      // 현재 세션의 시간 추가
      if (travelImageStartTimeRef.current > 0) {
        const timeSpent = (currentTime - travelImageStartTimeRef.current) / 1000 // 초 단위
        totalTime += timeSpent
      }
      
      // 현재 시간을 누적 시간에 저장
      setTravelImageTimes(prev => {
        const newMap = new Map(prev)
        newMap.set(currentTravelImageIndex, totalTime)
        return newMap
      })
      
      // 완료한 평가에 추가
      setCompletedRatingsMap(prev => {
        const newMap = new Map(prev)
        newMap.set(currentTravelImageIndex, { rating, thinkingTime: totalTime })
        return newMap
      })
      
      const response = await fetch('/api/travel-rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          imageFilename: currentImage,
          rating: rating,
          thinkingTimeSeconds: totalTime,
          testResultId: testResultId,
          gender: userInfo.gender,
          ageGroup: userInfo.ageGroup,
          region: userInfo.region
        }),
      })

      if (response.ok) {
        // 다음 사진으로 이동
        if (currentTravelImageIndex < travelImages.length - 1) {
          setCurrentTravelImageIndex(prev => prev + 1)
          // 다음 사진의 시작 시간 기록
          travelImageStartTimeRef.current = Date.now()
        } else {
          // 모든 사진 평가 완료 -> 이메일 입력 페이지로
          setShowTravelImages(false)
        }
      } else {
        console.error('Failed to save travel image rating')
        alert('평가 저장에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('Error submitting travel image rating:', error)
      alert('평가 저장 중 오류가 발생했습니다.')
    } finally {
      setIsRatingSubmitting(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setEmailError('이메일을 입력해주세요.')
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.')
      return
    }

    setIsEmailSubmitting(true)
    setEmailError('')

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          email
        }),
      })

      if (response.ok) {
        setEmailSubmitted(true)
        setEmail('')
      } else {
        const data = await response.json()
        setEmailError(data.error || '이메일 저장에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('Error submitting email:', error)
      setEmailError('이메일 저장 중 오류가 발생했습니다.')
    } finally {
      setIsEmailSubmitting(false)
    }
  }

  // 여행지 사진 평가 페이지
  if (isComplete && showTravelImages) {
    const currentImage = travelImages[currentTravelImageIndex]
    const totalQuestions = questions.length + travelImages.length
    const completedQuestions = questions.length + currentTravelImageIndex + 1
    const progress = (completedQuestions / totalQuestions) * 100
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-4xl w-full mx-4">
          {/* 진행 상황 표시 및 이전 버튼 */}
          <div className="mb-6">
            {/* 이전 버튼과 진행 상황 헤더 */}
            <div className="flex items-center gap-4 mb-2">
              {/* 이전 버튼 - 항상 표시 (첫 번째 사진일 때는 설문조사로, 그 외에는 이전 사진으로) */}
              <button
                onClick={handleTravelImagePrevious}
                disabled={isRatingSubmitting}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg font-semibold transition-colors min-h-[40px] touch-manipulation flex-shrink-0 ${
                  isRatingSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* 진행 상황 정보 */}
              <div className="flex justify-between items-center flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Image {currentTravelImageIndex + 1} of {travelImages.length}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {completedQuestions} / {totalQuestions} ({Math.round(progress)}%)
                </span>
              </div>
            </div>
            
            {/* 진행도 그래프 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 여행지 사진 */}
          <div className="mb-6">
            <img
              src={`/images/travel/${currentImage}`}
              alt={`Travel destination ${currentTravelImageIndex + 1}`}
              className="w-full h-auto rounded-lg shadow-lg object-cover max-h-[60vh]"
            />
            <p className="text-center text-lg font-semibold text-gray-800 mt-3">
              {travelImageNames[currentImage] || currentImage}
            </p>
            {currentImage === '03_cheongGyeCheon.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                Source: ©Korea Tourism Organization Photo Korea - Ji-ho Kim
              </p>
            )}
            {currentImage === '04_lotteWorld.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                Source: ©Korea Tourism Organization Photo Korea - Ji-ho Kim
              </p>
            )}
            {currentImage === '05_NationalMuseumOfKorea.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                Source: ©Korea Tourism Organization Photo Korea - Rin Choi
              </p>
            )}
            {currentImage === '06_HongdaeStreet.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                © Korea Tourism Organization (PhotoKorea) – Photo by Beom-su Lee
              </p>
            )}
            {currentImage === '07_bukchonHanokVillage.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                © Korea Tourism Organization (PhotoKorea) – Photo by IR Studio
              </p>
            )}
            {currentImage === '08_ikseondong.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                © Korea Tourism Organization (PhotoKorea) – Photo by Live Studio
              </p>
            )}
            {currentImage === '09_bukhanMountain.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                © Korea Tourism Organization (PhotoKorea) – Photo by Chi-un Won
              </p>
            )}
            {currentImage === '10_coex.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                © Korea Tourism Organization (PhotoKorea) – Photo by IR Studio
              </p>
            )}
            {currentImage === '11_gwangjangMarket.JPG' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                Source: Korea Agro-Fisheries & Food Trade Corporation (aT), https://www.at.or.kr/home/apko000000/index.action
              </p>
            )}
            {currentImage === '12_DDP(DongdaemunDesignPlaza).jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                © Korea Tourism Organization (PhotoKorea) – Photo by Sung-hwan Yoon
              </p>
            )}
            {currentImage === '13_leeumMuseumOfArt.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                Source: Yongsan-gu, Seoul, https://www.yongsan.go.kr/portal/main/main.do
              </p>
            )}
            {currentImage === '14_insadong.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                Source: National Museum of Korean Contemporary History, Alley in Insa-dong, Korea Open Government License (KOGL) Type 1
              </p>
            )}
            {currentImage === '15_SeoulForest.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                © Korea Tourism Organization (PhotoKorea) – Photo by Tae-Won Lim
              </p>
            )}
            {currentImage === '17_bongEunSaTemple.jpg' && (
              <p className="text-center text-xs text-gray-500 mt-1">
                © Korea Tourism Organization (PhotoKorea) – Photo by Beom-su Lee
              </p>
            )}
          </div>

          {/* 좋아요/싫어요 버튼 */}
          <div className="flex justify-center gap-6">
            <button
              onClick={() => handleTravelImageRating('soso')}
              disabled={isRatingSubmitting}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
                isRatingSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95 active:-translate-y-2'
              }`}
            >
              <img
                src="/images/buttons/soso.png"
                alt="Soso"
                className="h-24 w-auto sm:h-28 object-contain"
              />
              <span className="text-sm font-medium text-gray-700">Soso</span>
            </button>
            
            <button
              onClick={() => handleTravelImageRating('good')}
              disabled={isRatingSubmitting}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
                isRatingSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95 active:-translate-y-2'
              }`}
            >
              <img
                src="/images/buttons/good.png"
                alt="Good"
                className="h-24 w-auto sm:h-28 object-contain"
              />
              <span className="text-sm font-medium text-gray-700">Good</span>
            </button>
          </div>

          {isRatingSubmitting && (
            <div className="text-center text-gray-600 mt-4">
              Saving your rating...
            </div>
          )}
        </div>
      </div>
    )
  }

  // 이메일 입력 페이지
  if (isComplete && !showTravelImages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Test Complete!</h1>
            <p className="text-gray-600 mb-2">Thank you for completing the survey. Your responses are helpful.</p>
          </div>

          {/* 이메일 입력 섹션 */}
          {!emailSubmitted ? (
            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-gray-700 mb-4 text-center">
                Leave your email to receive travel app credits in the future. Credits can be used in the travel recommendation service to recommend destinations and routes.
              </p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError('')
                    }}
                    placeholder="Enter your email address"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500 ${
                      emailError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isEmailSubmitting}
                  />
                  {emailError && (
                    <p className="mt-2 text-sm text-red-600">{emailError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isEmailSubmitting}
                  className={`w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors ${
                    isEmailSubmitting
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'hover:bg-indigo-700'
                  }`}
                >
                  {isEmailSubmitting ? 'Submitting...' : 'Submit Email'}
                </button>
              </form>
            </div>
          ) : (
            <div className="border-t pt-6 mt-6">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-gray-700 mb-4">
                  Email has been successfully saved. Thank you!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length + travelImages.length
  const completedQuestions = currentQuestionIndex + 1
  const progress = (completedQuestions / totalQuestions) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-4 sm:py-8">
      <div className="max-w-3xl mx-auto">
        {/* 뒤로가기 버튼 및 Progress Bar */}
        <div className="mb-4 sm:mb-8">
          {/* 뒤로가기 버튼과 진행 상황 헤더 */}
          <div className="flex items-center gap-4 mb-2">
            {/* 뒤로가기 버튼 */}
            {currentQuestionIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg font-semibold transition-colors min-h-[40px] touch-manipulation flex-shrink-0 bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            {/* 진행 상황 정보 */}
            <div className="flex justify-between items-center flex-1">
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                {completedQuestions} / {totalQuestions} ({Math.round(progress)}%)
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-indigo-600 h-2 sm:h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
            {currentQuestion.question}
          </h2>

          <div className="space-y-2 sm:space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOptions.includes(index)
              
              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 min-h-[48px] touch-manipulation ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                      : 'border-gray-200 bg-white text-gray-700 active:border-indigo-300 active:bg-indigo-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm sm:text-base leading-relaxed">{option}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 버튼 영역 */}
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Next 버튼 (다중 선택일 때만 표시) */}
            {currentQuestion.type === 'multiple' && (
              <>
                <div className="flex-1 flex flex-col justify-center px-2 sm:px-0">
                  <div className="text-xs sm:text-sm text-gray-500 text-center">
                    Selected: {selectedOptions.length} / {currentQuestion.maxSelections || 3}
                  </div>
                </div>
                <button
                  onClick={handleNext}
                  disabled={selectedOptions.length === 0}
                  className={`flex-1 py-3 sm:py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 min-h-[48px] touch-manipulation ${
                    selectedOptions.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white active:bg-indigo-700'
                  }`}
                >
                  <span className="text-sm sm:text-base">Next</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {isSubmitting && (
          <div className="text-center text-gray-600">
            Submitting your responses...
          </div>
        )}
      </div>
    </div>
  )
}
