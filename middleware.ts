
import {
  createServerClient,
  type CookieOptions,
} from '@supabase/ssr';

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import {
  canAccess,
  homeRouteForRole,
  type AppRole,
} from '@/lib/roles';

const PUBLIC_PREFIXES = [
  '/',
  '/products',
  '/cart',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/shipping-policy',
  '/auth',
  '/api/webhooks',
  '/robots.txt',
  '/sitemap.xml',
];

// Routes that must remain accessible to a user who has
// must_change_password = true.
const PASSWORD_CHANGE_PATH = '/auth/change-password';

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) =>
    prefix === '/'
      ? pathname === '/'
      : pathname.startsWith(prefix)
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },

        set(
          name: string,
          value: string,
          options: CookieOptions
        ) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },

        remove(
          name: string,
          options: CookieOptions
        ) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // ------------------------------------------------------------
  // 1. Refresh/read authenticated session
  // ------------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ------------------------------------------------------------
  // 2. Public routes
  //
  // Unauthenticated users can access these routes.
  // ------------------------------------------------------------

  if (!user) {
    if (isPublic(pathname)) {
      return response;
    }

    const redirectUrl = new URL(
      '/auth/login',
      request.url
    );

    redirectUrl.searchParams.set(
      'redirectTo',
      pathname
    );

    return NextResponse.redirect(redirectUrl);
  }

  // ------------------------------------------------------------
  // 3. Load application profile
  // ------------------------------------------------------------

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(
      'role, is_active, must_change_password'
    )
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error(
      '[middleware] profile fetch failed:',
      profileError?.message,
      profileError?.code,
      'user:',
      user.id
    );

    return NextResponse.redirect(
      new URL('/auth/login', request.url)
    );
  }

  // ------------------------------------------------------------
  // 4. Active-account check
  // ------------------------------------------------------------

  if (profile.is_active !== true) {
    return NextResponse.redirect(
      new URL('/auth/deactivated', request.url)
    );
  }

  // ------------------------------------------------------------
  // 5. FIRST-LOGIN PASSWORD ENFORCEMENT
  //
  // A temporary-password account can access ONLY the
  // change-password page until the password is changed.
  // ------------------------------------------------------------

  if (
    profile.must_change_password === true &&
    pathname !== PASSWORD_CHANGE_PATH
  ) {
    return NextResponse.redirect(
      new URL(PASSWORD_CHANGE_PATH, request.url)
    );
  }

  // ------------------------------------------------------------
  // 6. Prevent already-completed users from visiting
  // the first-login password page.
  // ------------------------------------------------------------

  if (
    pathname === PASSWORD_CHANGE_PATH &&
    profile.must_change_password !== true
  ) {
    const role = profile.role as AppRole;

    return NextResponse.redirect(
      new URL(
        homeRouteForRole(role),
        request.url
      )
    );
  }

  // ------------------------------------------------------------
  // 7. Role-based authorization
  // ------------------------------------------------------------

  const role = (profile.role ?? 'customer') as AppRole;

  if (!canAccess(pathname, role)) {
    return NextResponse.redirect(
      new URL(
        homeRouteForRole(role),
        request.url
      )
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and image optimization.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)',
  ],
};
