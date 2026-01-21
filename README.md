# Travel Personality Test - Analytics Dashboard

사용자의 테스트 응답과 각 질문에서의 체류 시간을 추적하고 데이터베이스에 저장하는 웹 애플리케이션입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (권장)

## 주요 기능

1. **테스트 진행**: 사용자가 14개의 질문에 응답
2. **시간 추적**: 각 질문에서 보낸 시간(초 단위)을 자동으로 기록
3. **데이터 저장**: 모든 응답과 타이머 데이터를 Supabase에 저장
4. **분석 대시보드**: `/admin` 페이지에서 모든 응답 데이터 조회 및 분석

## 설치 및 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 파일의 내용 실행하여 테이블 생성
3. 프로젝트 설정에서 API URL과 API Key 확인

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 테스트 페이지를 확인하세요.

## 데이터베이스 스키마

### `test_results` 테이블
- 테스트 완료 정보 저장
- 세션 ID, IP 주소, User-Agent, 완료 시간 등

### `user_logs` 테이블
- 각 질문별 상세 로그 저장
- 질문 ID, 답변, 체류 시간(초) 등

## 페이지 구조

- `/` - 메인 테스트 페이지
- `/admin` - 관리자 대시보드 (모든 응답 조회)

## API 엔드포인트

### POST `/api/submit`
테스트 응답 제출

**Request Body:**
```json
{
  "sessionId": "string",
  "answers": [
    {
      "questionId": number,
      "answers": number[],
      "thinkingTime": number
    }
  ],
  "questions": Question[]
}
```

### GET `/api/results`
모든 테스트 결과 조회 (관리자용)

**Query Parameters:**
- `limit` (optional): 결과 개수 제한
- `offset` (optional): 페이지네이션 오프셋
- `sessionId` (optional): 특정 세션 결과 조회

## 배포

### Vercel 배포

1. GitHub 저장소에 코드 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 import
3. 환경 변수 설정
4. 배포 완료!

## 주요 기능 설명

### 시간 추적
- 각 질문이 표시될 때 시작 시간 기록
- 사용자가 답변을 선택하면 종료 시간과의 차이를 계산하여 초 단위로 저장
- 단일 선택 질문: 선택 즉시 다음 질문으로 이동
- 다중 선택 질문: "Next" 버튼 클릭 시 다음 질문으로 이동

### 데이터 수집
- 모든 사용자 선택 사항
- 각 질문에서의 체류 시간
- 세션 정보 (IP, User-Agent)
- 타임스탬프

### 분석 기능
- 전체 응답 조회
- 질문별 평균 체류 시간
- 가장 오래 고민한 질문 식별
- 세션별 상세 로그 확인
