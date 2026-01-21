import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 유지보수 모드 체크
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  
  // 관리자 페이지와 API, 유지보수 페이지는 제외
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
