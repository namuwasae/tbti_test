# 환경 변수 설정 가이드

## 1. 로컬 개발 환경 설정

### `.env.local` 파일 수정
프로젝트 루트 디렉토리의 `.env.local` 파일을 열고 실제 Supabase 값을 입력하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Supabase 값 확인 방법:**
1. https://app.supabase.com 접속
2. 프로젝트 선택
3. **Settings** → **API** 메뉴
4. 다음 값 확인:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 비공개로 유지)

**파일 위치:** `/Users/donghee/Desktop/namuwasae/project/tbti_test/.env.local`

## 2. Vercel 배포 환경 설정

### 방법 A: Vercel CLI 사용 (터미널)

환경 변수를 설정하려면 다음 명령어를 실행하세요:

```bash
# Production 환경
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Preview 환경 (선택사항)
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
```

각 명령어 실행 시 값을 입력하라는 프롬프트가 나타납니다.

### 방법 B: Vercel Dashboard 사용 (웹 브라우저)

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택 (또는 새로 생성)
3. **Settings** → **Environment Variables** 클릭
4. 각 환경 변수 추가:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Supabase Project URL
   - **Environment**: ✅ Production, ✅ Preview (선택사항)
   - **Add** 클릭
5. 나머지 두 변수도 동일하게 추가
6. **Deployments** → **Redeploy** 클릭하여 재배포

## 3. 환경 변수 확인

### 로컬에서 확인
```bash
# 개발 서버 실행
npm run dev

# 환경 변수가 제대로 로드되었는지 확인
# 브라우저 콘솔에서 확인하거나 API 호출 테스트
```

### Vercel에서 확인
1. Vercel Dashboard → **Settings** → **Environment Variables**
2. 설정된 변수 목록 확인
3. 배포 후 실제 동작 확인

## 4. 주의사항

- ⚠️ `.env.local` 파일은 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함됨)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY`는 절대 공개하지 마세요
- ⚠️ 환경 변수 변경 후에는 재배포가 필요합니다
- ✅ `NEXT_PUBLIC_` 접두사가 있는 변수는 클라이언트에서 접근 가능합니다
- ✅ `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 사용됩니다

## 5. 문제 해결

### 환경 변수가 적용되지 않을 때
1. 파일 이름 확인: `.env.local` (정확한 이름)
2. 서버 재시작: `npm run dev` 중지 후 다시 실행
3. Vercel 재배포: Dashboard에서 "Redeploy" 클릭

### Supabase 연결 오류
1. Supabase 프로젝트가 활성화되어 있는지 확인
2. API 키가 올바른지 확인
3. Supabase Dashboard에서 프로젝트 상태 확인
