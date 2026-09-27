'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { roleLabel } from '@/lib/role-labels';
import { homeRouteForRole } from '@/lib/roles';
import { useCart } from '@/lib/cart-context';
import { useOnClickOutside } from '@/lib/use-on-click-outside';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/dashboard', label: 'Track Order' },
  { href: '/contact', label: 'Contact Us' },
];

export function Header() {
  const { user, profile, loading, signOut } = useAuth();
  const { items } = useCart();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false); // account dropdown
  const [mobileOpen, setMobileOpen] = useState(false); // hamburger

  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setMenuOpen(false));

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const initial = (profile?.full_name || user?.email || '?').charAt(0).toUpperCase();

  async function handleLogout() {
    setMenuOpen(false);
    setMobileOpen(false);
    await signOut();
    router.push('/');
    router.refresh();
  }

  const dashboardHref = profile ? homeRouteForRole(profile.role) : '/dashboard';

  const accountMenuItems = [
    ...(profile?.role === 'admin'
      ? [{ href: '/admin', label: 'Admin Panel' },
    { href: '/admin/products', label: 'Product Management' }]
      : []),
    { href: dashboardHref, label: 'My Dashboard' },
    { href: '/dashboard/orders', label: 'My Orders' },
    { href: '/dashboard/settings', label: 'My Profile / Settings' },
    { href: '/dashboard/addresses', label: 'Addresses' },
    { href: '/dashboard/notifications', label: 'Notifications' },
    { href: '/dashboard/support', label: 'Support' },
  ];

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="topbar-inner">
          <span>Delivering fresh, every morning across Latur District</span>
          <span className="topbar-sub">Farmer-first. Household-trusted.</span>
        </div>
      </div>

      <div className="navbar">
        <div className="navbar-inner">
          <Link href="/" className="logo">
            <Image
              src="/logo.png"
              alt="Pandurang Milk Product"
              width={44}
              height={44}
              className="logo-mark"
            />
            <span className="logo-main">Pandurang</span>
            <span className="logo-sub">Milk Product</span>
          </Link>

          {/* Desktop nav */}
          <nav className="nav-links hidden md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/cart" className="cart-btn relative">
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-brand-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {loading ? (
              <div className="w-24 h-9 rounded-full bg-white/20 animate-pulse" />
            ) : user && profile ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full pl-2 pr-3 py-1.5 text-white transition-colors"
                >
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-white text-brand-700 font-semibold flex items-center justify-center text-sm">
                      {initial}
                    </span>
                  )}
                  <span className="text-sm font-medium max-w-[9rem] truncate">
                    {profile.full_name}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M5.5 7.5l4.5 5 4.5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl2 shadow-lg border border-gray-100 py-2 text-gray-800 z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-sm font-semibold truncate">{profile.full_name}</p>
                      <span className="inline-block mt-1 text-xs font-medium text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">
                        {roleLabel(profile.role)}
                      </span>
                    </div>
                    {accountMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="rounded-full bg-white text-brand-700 font-semibold px-4 py-1.5 text-sm hover:bg-cream-50 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full border border-white text-white font-medium px-4 py-1.5 text-sm hover:bg-white/10 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/cart" className="cart-btn relative">
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-brand-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white"
            >
              {mobileOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <nav className="flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-gray-100 my-1" />

            {loading ? (
              <div className="px-5 py-3 text-sm text-gray-400">Loading…</div>
            ) : user && profile ? (
              <>
                <div className="px-5 py-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center">
                    {initial}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{profile.full_name}</p>
                    <p className="text-xs text-gray-500">{roleLabel(profile.role)}</p>
                  </div>
                </div>
                {accountMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="text-left px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2 px-5 py-3">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center rounded-full bg-brand-600 text-white font-semibold px-4 py-2 text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center rounded-full border border-brand-600 text-brand-700 font-medium px-4 py-2 text-sm"
                >
                  Create Account
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}


