import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAIN_ORIGIN = 'https://anino-ai.com';

type ProtectedApp = {
  internalPath: string;
  entryCookie: string;
};

const PROTECTED_APPS: Record<string, ProtectedApp> = {
  'agent.anino-ai.com': {
    internalPath: '/agent',
    entryCookie: 'anino_agent_entry_once',
  },
  'whatsapp-agent.anino-ai.com': {
    internalPath: '/whatsapp-agent',
    entryCookie: 'anino_whatsapp_agent_entry_once',
  },
};

function getRequestHost(request: NextRequest) {
  const raw =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname;

  return raw
    .split(',')[0]
    .trim()
    .replace(/:\d+$/, '')
    .toLowerCase();
}

function isInternalRoute(pathname: string, internalPath: string) {
  return pathname === internalPath || pathname.startsWith(`${internalPath}/`);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = getRequestHost(request);
  const protectedApp = PROTECTED_APPS[host];

  if (
    (host === 'anino-ai.com' || host === 'www.anino-ai.com') &&
    (pathname === '/wallet' || pathname.startsWith('/wallet/'))
  ) {
    const walletPass = request.cookies.get('anino_wallet_entry_once')?.value;

    if (!walletPass) {
      return NextResponse.redirect(new URL('/login', MAIN_ORIGIN));
    }

    const response = NextResponse.next();

    response.cookies.set({
      name: 'anino_wallet_entry_once',
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    response.headers.set('Cache-Control', 'no-store');
    return response;
  }


  if (protectedApp) {
    const isProtectedPage =
      pathname === '/' ||
      isInternalRoute(pathname, protectedApp.internalPath);

    if (isProtectedPage) {
      const entryPass = request.cookies.get(protectedApp.entryCookie)?.value;
      const appAuthToken = request.cookies.get('auth_token')?.value;

      if (!entryPass && !appAuthToken) {
        return NextResponse.redirect(new URL('/login', MAIN_ORIGIN));
      }

      const response =
        pathname === '/'
          ? NextResponse.rewrite(
              new URL(protectedApp.internalPath, request.url)
            )
          : NextResponse.next();

      if (entryPass) {
        response.cookies.set({
          name: protectedApp.entryCookie,
          value: '',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          domain: '.anino-ai.com',
          maxAge: 0,
        });
      }

      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    return NextResponse.next();
  }

  const isOldInternalRoute = Object.values(PROTECTED_APPS).some((app) =>
    isInternalRoute(pathname, app.internalPath)
  );

  if (isOldInternalRoute) {
    return NextResponse.redirect(new URL('/', MAIN_ORIGIN));
  }

  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.redirect(new URL('/login', MAIN_ORIGIN));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/agent/:path*', '/whatsapp-agent/:path*', '/wallet/:path*'],
};
