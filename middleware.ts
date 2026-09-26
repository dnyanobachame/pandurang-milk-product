import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canAccess, homeRouteForRole, type AppRole } from '@/lib/roles';

const PUBLIC_PREFIXES = [
  '/', '/products', '/cart', '/about', '/contact', '/terms', '/privacy',
  '/refund-policy', '/shipping-policy', '/auth', '/api/webhooks',
];
// Note: /cart is public so guests can build a cart before signing in
// (it reads from localStorage, not the DB); /checkout still requires
// auth since placing an order always does.

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p)
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if expired — required for Server Components to see
  // an up-to-date session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return response;
  }

  if (!user) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('[middleware] profile fetch failed:', profileError.message, profileError.code, 'user:', user.id);
  }

  const role = (profile?.role ?? 'customer') as AppRole;

  if (!profile?.is_active) {
    return NextResponse.redirect(new URL('/auth/deactivated', request.url));
  }

  if (!canAccess(pathname, role)) {
    return NextResponse.redirect(new URL(homeRouteForRole(role), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and image optimization,
     * so middleware runs on every navigable route.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)',
  ],
};