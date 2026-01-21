# Supabase 데이터베이스 설정 가이드

이 디렉토리에는 Supabase 데이터베이스 스키마와 마이그레이션 파일이 있습니다.

## 파일 구조

```
supabase/
├── schema.sql                    # 전체 스키마 정의 (새 프로젝트용)
├── migration_add_demographics.sql # 기존 테이블에 컬럼 추가 (기존 프로젝트용)
└── README.md                     # 이 파일
```

## 각 파일의 역할

### 1. `schema.sql` - 전체 스키마 정의
**용도**: 새로 프로젝트를 시작하거나 데이터베이스를 처음 설정할 때 사용

**포함 내용**:
- 모든 테이블 생성 (`test_results`, `user_logs`, `user_dropouts`, `user_emails`)
- 모든 인덱스 생성
- **이미 `gender`, `age_group`, `region` 컬럼이 포함되어 있음**

**언제 사용하나요?**
- ✅ Supabase 프로젝트를 처음 생성했을 때
- ✅ 데이터베이스를 완전히 새로 만들 때
- ✅ 테스트 환경을 처음 설정할 때

### 2. `migration_add_demographics.sql` - 마이그레이션 스크립트
**용도**: 이미 테이블이 존재하는 기존 프로젝트에 컬럼을 추가할 때 사용

**포함 내용**:
- `test_results` 테이블에 `gender`, `age_group`, `region` 컬럼 추가
- 안전하게 실행 가능 (이미 존재하면 무시)

**언제 사용하나요?**
- ✅ 이미 `test_results` 테이블이 존재하는 경우
- ✅ 기존 데이터를 유지하면서 컬럼만 추가하고 싶을 때
- ✅ 프로덕션 환경에서 스키마를 업데이트할 때

## Supabase 연결 및 SQL 실행 방법

### 방법 1: Supabase 웹 대시보드 사용 (권장)

#### 1단계: Supabase 프로젝트 접속
1. [Supabase 대시보드](https://app.supabase.com)에 로그인
2. 프로젝트 선택

#### 2단계: SQL Editor 열기
1. 왼쪽 사이드바에서 **SQL Editor** 아이콘 클릭
2. **"New query"** 버튼 클릭

#### 3단계: SQL 실행
**새 프로젝트인 경우:**
1. `schema.sql` 파일 내용을 전체 복사
2. SQL Editor에 붙여넣기
3. **"RUN"** 버튼 클릭 (또는 `Ctrl/Cmd + Enter`)

**기존 프로젝트인 경우:**
1. `migration_add_demographics.sql` 파일 내용을 전체 복사
2. SQL Editor에 붙여넣기
3. **"RUN"** 버튼 클릭 (또는 `Ctrl/Cmd + Enter`)

#### 4단계: 결과 확인
- 성공 메시지 확인
- 왼쪽 사이드바의 **Table Editor**에서 테이블 확인

### 방법 2: Supabase CLI 사용 (고급)

```bash
# Supabase CLI 설치 (한 번만)
npm install -g supabase

# Supabase 프로젝트 연결
supabase link --project-ref your-project-ref

# SQL 파일 실행
supabase db execute --file supabase/schema.sql
```

## 현재 상황별 실행 가이드

### 시나리오 A: 새 프로젝트 (데이터베이스가 비어있음)
```sql
-- schema.sql 파일 전체 실행
```
✅ `schema.sql`만 실행하면 됩니다.

### 시나리오 B: 기존 프로젝트 (test_results 테이블이 이미 있음)
```sql
-- migration_add_demographics.sql 파일 실행
```
✅ `migration_add_demographics.sql`만 실행하면 됩니다.

### 시나리오 C: 어떤 파일을 실행해야 할지 모르겠음
1. Supabase 대시보드 → **Table Editor** 열기
2. `test_results` 테이블이 있는지 확인
3. 있으면 → `migration_add_demographics.sql` 실행
4. 없으면 → `schema.sql` 실행

## 코드에서 Supabase 연결 방법

프로젝트 코드는 `lib/supabase.ts` 파일을 통해 Supabase에 연결됩니다.

### 연결 구조

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 설정 읽기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
```

### 환경 변수 설정

`.env.local` 파일에 다음 변수들이 설정되어 있어야 합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**중요**: 
- SQL 파일 실행은 **Supabase 웹 대시보드**에서 수동으로 해야 합니다
- 코드는 SQL 실행 후에만 데이터베이스에 접근할 수 있습니다
- SQL 실행과 코드 연결은 **별개의 과정**입니다

## 문제 해결

### Q: SQL을 실행했는데 여전히 에러가 발생해요
A: 
1. Supabase 대시보드 → **Table Editor**에서 테이블 구조 확인
2. 필요한 컬럼이 있는지 확인
3. 없다면 마이그레이션 파일 다시 실행

### Q: 어떤 파일을 실행해야 할지 모르겠어요
A: 
- **새 프로젝트** → `schema.sql`
- **기존 프로젝트** → `migration_add_demographics.sql`

### Q: SQL을 여러 번 실행해도 되나요?
A: 
- `schema.sql`: 여러 번 실행해도 안전 (IF NOT EXISTS 사용)
- `migration_add_demographics.sql`: 여러 번 실행해도 안전 (컬럼 존재 여부 확인)

## 다음 단계

SQL 실행이 완료되면:
1. `.env.local` 파일에 환경 변수가 설정되어 있는지 확인
2. 개발 서버 재시작: `npm run dev`
3. 테스트 페이지에서 데이터 제출 테스트
