# Supabase 연결 가이드

이 문서는 이 프로젝트에서 Supabase를 연결하는 전체 과정을 단계별로 자세히 설명합니다.

## 목차

1. [Supabase 프로젝트 생성](#1-supabase-프로젝트-생성)
2. [API 키 확인](#2-api-키-확인)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [데이터베이스 스키마 생성](#4-데이터베이스-스키마-생성)
5. [코드 구조 설명](#5-코드-구조-설명)
6. [연결 테스트](#6-연결-테스트)
7. [문제 해결](#7-문제-해결)

---

## 1. Supabase 프로젝트 생성

### 1.1 Supabase 가입 및 로그인

1. [Supabase 공식 웹사이트](https://supabase.com)에 접속합니다.
2. "Start your project" 버튼을 클릭하여 가입/로그인합니다.
3. GitHub 계정으로 가입하거나 이메일로 가입할 수 있습니다.

### 1.2 새 프로젝트 생성

1. 로그인 후 대시보드에서 **"New Project"** 버튼을 클릭합니다.
2. 다음 정보를 입력합니다:
   - **Organization**: 새로 만들거나 기존 조직 선택
   - **Name**: 프로젝트 이름 (예: `tbti-test`)
   - **Database Password**: 강력한 데이터베이스 비밀번호 설정 (⚠️ 저장해두세요!)
   - **Region**: 가장 가까운 지역 선택 (예: Northeast Asia (Seoul))
3. **"Create new project"** 버튼을 클릭합니다.
4. 프로젝트가 생성되는 동안 약 2분 정도 기다립니다.

---

## 2. API 키 확인

Supabase 프로젝트를 사용하려면 두 가지 API 키가 필요합니다.

### 2.1 Anon Key (공개 키) - 클라이언트용

1. 프로젝트 대시보드의 왼쪽 사이드바에서 **Settings** (⚙️ 아이콘) 클릭
2. **API** 메뉴 클릭
3. **Project API keys** 섹션에서 다음 정보를 확인:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co` 형식
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 형식의 긴 문자열

### 2.2 Service Role Key (서버용) - 관리자 키

⚠️ **주의**: Service Role Key는 **절대 클라이언트 코드에 노출되어서는 안 됩니다!**
이 키는 서버 사이드에서만 사용해야 합니다.

1. 같은 **Settings > API** 페이지에서
2. **Project API keys** 섹션의 **service_role** 키 확인
3. **"Reveal"** 버튼을 클릭하여 키를 표시합니다

---

## 3. 환경 변수 설정

Next.js에서 환경 변수를 사용하여 Supabase를 연결합니다.

### 3.1 .env.local 파일 생성

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성합니다.

```bash
# 프로젝트 루트에서 실행
touch .env.local
```

### 3.2 환경 변수 입력

`.env.local` 파일에 다음 내용을 입력합니다 (실제 키 값으로 교체):

```env
# Supabase Project URL (Settings > API > Project URL)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Supabase Anon Key (Settings > API > anon/public key)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase Service Role Key (Settings > API > service_role key)
# ⚠️ 이 키는 서버에서만 사용되며 절대 클라이언트에 노출되면 안 됩니다!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.3 환경 변수 설명

| 변수명 | 용도 | 접근 위치 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 클라이언트 + 서버 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 키 (제한된 권한) | 클라이언트 + 서버 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 역할 키 (전체 권한) | 서버 전용 ⚠️ |

**`NEXT_PUBLIC_` 접두사의 의미:**
- Next.js에서 `NEXT_PUBLIC_` 접두사가 붙은 변수는 브라우저에서도 접근 가능합니다.
- `SUPABASE_SERVICE_ROLE_KEY`에는 이 접두사가 없으므로 서버 사이드에서만 접근 가능합니다.

---

## 4. 데이터베이스 스키마 생성

데이터베이스 테이블을 생성해야 합니다.

### 4.1 SQL Editor 열기

1. Supabase 대시보드의 왼쪽 사이드바에서 **SQL Editor** 아이콘 클릭
2. **"New query"** 버튼 클릭

### 4.2 스키마 SQL 실행

프로젝트의 `supabase/schema.sql` 파일 내용을 복사하여 SQL Editor에 붙여넣습니다:

```sql
-- 테스트 결과 테이블
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  answers JSONB NOT NULL
);

-- 사용자 로그 테이블 (각 질문별 응답 및 체류 시간)
CREATE TABLE IF NOT EXISTS user_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID REFERENCES test_results(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_index INTEGER NOT NULL,
  thinking_time_seconds DECIMAL(10, 3) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_test_results_session_id ON test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_user_logs_test_result_id ON user_logs(test_result_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_session_id ON user_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_question_id ON user_logs(question_id);
```

3. **"RUN"** 버튼 클릭 (또는 `Ctrl/Cmd + Enter`)

### 4.3 테이블 확인

1. 왼쪽 사이드바에서 **Table Editor** 아이콘 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - `test_results`
   - `user_logs`

---

## 5. 코드 구조 설명

프로젝트에서 Supabase를 어떻게 사용하는지 설명합니다.

### 5.1 Supabase 클라이언트 생성 (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 일반 클라이언트 (클라이언트 사이드에서 사용 가능, 제한된 권한)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 관리자 클라이언트 (서버 사이드 전용, 전체 권한)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**두 가지 클라이언트의 차이:**

| 클라이언트 | 사용 위치 | 권한 | Row Level Security (RLS) |
|-----------|----------|------|-------------------------|
| `supabase` | 클라이언트 + 서버 | 제한적 | 적용됨 |
| `supabaseAdmin` | 서버 전용 | 전체 권한 | 우회됨 |

**현재 프로젝트에서는 `supabaseAdmin`만 사용합니다.**
- 이유: API Route는 서버 사이드에서 실행되므로 관리자 키를 사용하여 RLS를 우회하고 데이터를 자유롭게 저장/조회할 수 있습니다.

### 5.2 API Route에서 사용 (`app/api/submit/route.ts`)

```typescript
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // 1. 데이터 삽입
  const { data: testResult, error: testResultError } = await supabaseAdmin
    .from('test_results')  // 테이블 이름
    .insert({              // 데이터 삽입
      session_id: sessionId,
      user_agent: userAgent,
      ip_address: ipAddress,
      answers: answers,
      completed_at: new Date().toISOString()
    })
    .select()              // 삽입된 데이터 반환
    .single()              // 단일 행 반환

  // 2. 에러 처리
  if (testResultError) {
    console.error('Error:', testResultError)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // 3. 여러 데이터 일괄 삽입
  const { error: logsError } = await supabaseAdmin
    .from('user_logs')
    .insert(logs)  // 배열을 삽입하면 여러 행이 한 번에 삽입됩니다
}
```

**주요 메서드:**

- `.from('table_name')`: 테이블 선택
- `.insert(data)`: 데이터 삽입
- `.select()`: 삽입/조회한 데이터 반환
- `.single()`: 단일 행 반환 (여러 행이면 에러)
- `.eq('column', value)`: WHERE 조건 (같음)
- `.order('column', { ascending: true })`: 정렬

### 5.3 데이터 조회 (`app/api/results/route.ts`)

```typescript
// 모든 테스트 결과 조회
const { data: testResults, error: testResultsError } = await supabaseAdmin
  .from('test_results')
  .select('*')                    // 모든 컬럼 선택
  .order('created_at', { ascending: false })  // 최신순 정렬
  .range(offset, offset + limit - 1)  // 페이지네이션

// 특정 세션의 로그 조회
const { data: logs, error: logsError } = await supabaseAdmin
  .from('user_logs')
  .select('*')
  .eq('session_id', sessionId)    // session_id가 일치하는 행만
  .order('question_id', { ascending: true })
```

---

## 6. 연결 테스트

### 6.1 개발 서버 실행

```bash
# 의존성 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev
```

### 6.2 테스트 페이지에서 확인

1. 브라우저에서 `http://localhost:3000` 접속
2. 테스트를 진행하여 데이터가 저장되는지 확인
3. `http://localhost:3000/admin` 접속하여 데이터가 조회되는지 확인

### 6.3 Supabase Table Editor에서 확인

1. Supabase 대시보드의 **Table Editor**로 이동
2. `test_results` 테이블 클릭
3. 데이터가 저장되었는지 확인
4. `user_logs` 테이블도 확인

---

## 7. 문제 해결

### 7.1 "Invalid API key" 에러

**원인**: API 키가 잘못되었거나 환경 변수가 설정되지 않음

**해결 방법**:
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 환경 변수 이름이 정확한지 확인 (대소문자 구분)
3. API 키가 올바르게 복사되었는지 확인 (앞뒤 공백 없음)
4. 개발 서버를 재시작 (`Ctrl+C` 후 `npm run dev`)

### 7.2 "relation does not exist" 에러

**원인**: 테이블이 생성되지 않음

**해결 방법**:
1. Supabase SQL Editor에서 `supabase/schema.sql` 내용을 다시 실행
2. Table Editor에서 테이블이 존재하는지 확인

### 7.3 "new row violates row-level security policy" 에러

**원인**: Row Level Security (RLS) 정책 때문에 접근이 거부됨

**해결 방법**:
- 현재 프로젝트는 `supabaseAdmin`을 사용하므로 RLS를 우회합니다.
- 만약 `supabase` 클라이언트를 사용한다면, Supabase 대시보드에서 RLS 정책을 설정해야 합니다.

### 7.4 환경 변수가 로드되지 않음

**원인**: Next.js가 환경 변수를 캐시했거나 서버가 재시작되지 않음

**해결 방법**:
1. 개발 서버 중지 (`Ctrl+C`)
2. `.next` 폴더 삭제: `rm -rf .next`
3. 개발 서버 재시작: `npm run dev`

### 7.5 네트워크 오류

**원인**: Supabase URL이 잘못되었거나 네트워크 문제

**해결 방법**:
1. Supabase 대시보드에서 프로젝트가 활성화되어 있는지 확인
2. URL에 `https://`가 포함되어 있는지 확인
3. 브라우저 개발자 도구의 Network 탭에서 실제 요청 URL 확인

---

## 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript 클라이언트 가이드](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js 환경 변수 문서](https://nextjs.org/docs/basic-features/environment-variables)
