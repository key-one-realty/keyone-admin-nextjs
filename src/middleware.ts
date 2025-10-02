import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nonAuthRequiredPages } from './utils/constants/constants'; 

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const currentPath = request.nextUrl.pathname;
  const isNonAuthPage = nonAuthRequiredPages.includes(currentPath);

  if (!token && !isNonAuthPage) {
    const loginUrl = new URL('/signin', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isNonAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}
export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico|images).*)'],
};
