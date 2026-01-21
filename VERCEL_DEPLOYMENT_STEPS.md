# Vercel 배포 단계별 가이드

## 현재 상태
- ✅ Git 저장소 초기화 완료
- ✅ GitHub 저장소 생성 및 푸시 완료: https://github.com/namuwasae/tbti_test
- ✅ 빌드 오류 수정 완료
- ⏳ Vercel 배포 진행 중

## 다음 단계: Vercel Dashboard에서 배포

### 1. Vercel Dashboard 접속
1. https://vercel.com/dashboard 접속
2. GitHub 계정으로 로그인 (이미 로그인되어 있을 수 있음)

### 2. 프로젝트 Import
1. Dashboard에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소 목록에서 **"namuwasae/tbti_test"** 선택
3. **"Import"** 클릭

### 3. 프로젝트 설정 확인
다음 설정이 자동으로 감지되어야 합니다:
- **Framework Preset**: Next.js
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (기본값)
- **Output Directory**: `.next` (기본값)
- **Install Command**: `npm install` (기본값)

### 4. 환경 변수 설정 (중요!)
**"Environment Variables"** 섹션에서 다음 변수들을 추가하세요:

#### 필수 환경 변수:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### 선택적 환경 변수:
```
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

**환경 변수 설정 방법:**
1. 각 변수마다 **"Add"** 클릭
2. **Name** 입력
3. **Value** 입력 (Supabase Dashboard에서 확인)
4. **Environment** 선택:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (선택사항)
5. **Save** 클릭

**Supabase 값 확인 방법:**
1. Supabase Dashboard (https://app.supabase.com) 접속
2. 프로젝트 선택
3. **Settings** → **API** 메뉴
4. 다음 값 확인:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (주의: 이 키는 비공개로 유지)

### 5. 배포 실행
1. 모든 환경 변수를 설정한 후
2. **"Deploy"** 버튼 클릭
3. 빌드 로그 확인 (약 1-2분 소요)
4. 배포 완료 후 제공되는 URL 확인

### 6. 배포 확인
배포가 완료되면:
- 프로덕션 URL: `https://your-project-name.vercel.app`
- 각 커밋마다 Preview URL 자동 생성

### 7. 자동 배포 설정
GitHub에 코드를 푸시하면 자동으로 재배포됩니다:
```bash
git add .
git commit -m "Update"
git push origin main
```

## 문제 해결

### 배포 실패 시
1. Vercel Dashboard → **Deployments** 탭에서 실패한 배포 클릭
2. 빌드 로그 확인
3. 환경 변수 누락 확인
4. Supabase 연결 상태 확인

### 환경 변수 적용 안 됨
1. 환경 변수 저장 후 **재배포** 필요
2. Vercel Dashboard → **Deployments** → **"Redeploy"** 클릭

### Supabase 연결 오류
1. Supabase 프로젝트가 활성화되어 있는지 확인
2. API 키가 올바른지 확인
3. Supabase Dashboard에서 프로젝트 상태 확인

## 유지보수 모드 활성화
필요시 유지보수 모드를 활성화할 수 있습니다:
1. Vercel Dashboard → **Settings** → **Environment Variables**
2. `NEXT_PUBLIC_MAINTENANCE_MODE` = `true` 설정
3. **Deployments** → **"Redeploy"** 클릭

## 참고 링크
- GitHub 저장소: https://github.com/namuwasae/tbti_test
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
