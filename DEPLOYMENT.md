# 배포 가이드

이 문서는 웹사이트 배포 방법, 유지보수 모드 설정, 재배포 방법을 설명합니다.

## 목차

1. [Vercel 배포 (권장)](#1-vercel-배포-권장)
2. [유지보수 모드 설정](#2-유지보수-모드-설정)
3. [재배포 방법](#3-재배포-방법)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [기타 배포 옵션](#5-기타-배포-옵션)

---

## 1. Vercel 배포 (권장)

Vercel은 Next.js 프로젝트를 배포하기에 가장 적합한 플랫폼입니다.

### 1.1 Vercel 계정 생성

1. [Vercel 웹사이트](https://vercel.com)에 접속
2. "Sign Up" 버튼 클릭
3. GitHub 계정으로 가입 (권장)

### 1.2 프로젝트 준비

#### Git 저장소에 코드 푸시

```bash
# Git 저장소 초기화 (이미 있으면 생략)
git init

# .gitignore 확인 (이미 생성됨)
cat .gitignore

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/yourusername/your-repo.git
git branch -M main
git push -u origin main
```

### 1.3 Vercel에 프로젝트 배포

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. **"Add New..."** → **"Project"** 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (기본값)
   - **Output Directory**: `.next` (기본값)
   - **Install Command**: `npm install` (기본값)
5. **"Environment Variables"** 클릭하여 환경 변수 추가 (자세한 내용은 [환경 변수 설정](#4-환경-변수-설정) 참고)
6. **"Deploy"** 버튼 클릭
7. 배포 완료 후 제공되는 URL 확인 (예: `https://your-project.vercel.app`)

### 1.4 자동 배포 설정

GitHub에 코드를 푸시하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Update project"
git push origin main
```

---

## 2. 유지보수 모드 설정

질문지 업데이트 등으로 사이트를 일시적으로 막아야 할 때 사용합니다.

### 2.1 방법 A: 유지보수 페이지 추가 (권장)

#### 1) 유지보수 페이지 생성

`app/maintenance/page.tsx` 파일 생성:

```typescript
export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-4">
          <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Maintenance Mode</h1>
        <p className="text-gray-600 mb-6">
          We are currently updating the test. Please come back later.
        </p>
        <p className="text-sm text-gray-500">
          업데이트 중입니다. 잠시 후 다시 접속해주세요.
        </p>
      </div>
    </div>
  )
}
```

#### 2) 메인 페이지를 유지보수로 리다이렉트

`app/page.tsx` 최상단에 유지보수 모드 체크 추가:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  
  // 유지보수 모드 체크
  useEffect(() => {
    // 환경 변수로 유지보수 모드 제어
    const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
    
    if (maintenanceMode) {
      router.push('/maintenance')
    }
  }, [router])

  // ... 나머지 코드
}
```

또는 더 간단하게 `app/layout.tsx`에서 리다이렉트:

```typescript
import { redirect } from 'next/navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 유지보수 모드 체크
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
    redirect('/maintenance')
  }

  // ... 나머지 코드
}
```

#### 3) Vercel 환경 변수 설정

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 새 환경 변수 추가:
   - **Name**: `NEXT_PUBLIC_MAINTENANCE_MODE`
   - **Value**: `true`
   - **Environment**: Production, Preview, Development (필요에 따라)
4. **Save** 클릭
5. 재배포 (자동 또는 수동)

#### 4) 유지보수 모드 해제

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. `NEXT_PUBLIC_MAINTENANCE_MODE` 변수 삭제 또는 값을 `false`로 변경
3. 재배포

### 2.2 방법 B: Vercel Deployment Protection 사용

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Deployment Protection**
3. **Password Protection** 활성화
4. 비밀번호 설정

### 2.3 방법 C: 간단한 미들웨어 사용 (추천)

`middleware.ts` 파일 생성 (프로젝트 루트):

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 유지보수 모드 체크
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  
  // 관리자 페이지와 API는 제외
  if (maintenanceMode && 
      !request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/api') &&
      !request.nextUrl.pathname.startsWith('/maintenance')) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

## 3. 재배포 방법

### 3.1 자동 재배포 (Git Push)

코드를 수정하고 GitHub에 푸시하면 자동으로 재배포됩니다:

```bash
git add .
git commit -m "Update test questions"
git push origin main
```

### 3.2 수동 재배포

1. Vercel Dashboard → 프로젝트 선택
2. **Deployments** 탭 클릭
3. 최신 배포 옆 **"..."** 메뉴 클릭
4. **"Redeploy"** 선택

### 3.3 특정 커밋으로 재배포

1. Vercel Dashboard → **Deployments** 탭
2. 원하는 배포 선택
3. **"..."** 메뉴 → **"Redeploy"**

### 3.4 환경 변수 변경 후 재배포

환경 변수를 변경한 후에는 재배포해야 적용됩니다:

1. 환경 변수 변경 (Settings → Environment Variables)
2. **Deployments** 탭에서 **"Redeploy"** 클릭

---

## 4. 환경 변수 설정

### 4.1 Vercel 환경 변수 설정

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 변수 추가:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

4. **Environment** 선택:
   - **Production**: 프로덕션 환경
   - **Preview**: 프리뷰/스테이징 환경
   - **Development**: 로컬 개발 환경

5. **Save** 클릭

### 4.2 환경별 설정

- **Production**: 실제 사용자에게 보이는 사이트
- **Preview**: 각 브랜치/PR마다 자동 생성되는 배포
- **Development**: 로컬 개발 환경 (`.env.local` 파일 사용)

---

## 5. 기타 배포 옵션

### 5.1 Netlify

1. [Netlify](https://www.netlify.com) 계정 생성
2. **Add new site** → **Import an existing project**
3. GitHub 저장소 연결
4. 빌드 설정:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. 환경 변수 설정
6. **Deploy site**

### 5.2 자체 서버 (Node.js)

```bash
# 프로덕션 빌드
npm run build

# 서버 시작
npm start
```

또는 PM2 사용:

```bash
# PM2 설치
npm install -g pm2

# 프로덕션 빌드
npm run build

# PM2로 실행
pm2 start npm --name "tbti-test" -- start
pm2 save
pm2 startup
```

### 5.3 Docker

`Dockerfile` 생성:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

---

## 빠른 참조

### 유지보수 모드 ON

1. Vercel Dashboard → Settings → Environment Variables
2. `NEXT_PUBLIC_MAINTENANCE_MODE` = `true` 추가/수정
3. 재배포

### 유지보수 모드 OFF

1. Vercel Dashboard → Settings → Environment Variables
2. `NEXT_PUBLIC_MAINTENANCE_MODE` 삭제 또는 `false`로 변경
3. 재배포

### 재배포

```bash
# 방법 1: Git Push (자동 재배포)
git push origin main

# 방법 2: Vercel Dashboard에서 수동 재배포
```

---

## 문제 해결

### 배포 실패

1. **빌드 로그 확인**: Vercel Dashboard → Deployments → 실패한 배포 클릭
2. **환경 변수 확인**: 모든 필수 환경 변수가 설정되었는지 확인
3. **의존성 문제**: `package.json`의 의존성 버전 확인

### 환경 변수 적용 안 됨

1. 환경 변수 저장 후 **재배포** 필요
2. `NEXT_PUBLIC_` 접두사 확인 (클라이언트에서 접근하려면 필요)
3. 환경(Production/Preview/Development) 선택 확인

### 유지보수 모드 작동 안 함

1. 환경 변수 값이 정확한지 확인 (`true` / `false`)
2. `middleware.ts` 또는 리다이렉트 로직 확인
3. 캐시 문제일 수 있으므로 하드 리프레시 (Ctrl+Shift+R)
