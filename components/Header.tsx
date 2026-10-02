'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Menu,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { roleLabel } from '@/lib/role-labels';
import { homeRouteForRole } from '@/lib/roles';
import { useCart } from '@/lib/cart-context';
import { useOnClickOutside } from '@/lib/use-on-click-outside';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/dashboard', label: 'Track Order' },
  { href: '/contact', label: 'Contact' },
];

const CATEGORY_LINKS = [
  { href: '/milk', label: 'Milk' },
  { href: '/cow-milk', label: 'Cow Milk' },
  { href: '/buffalo-milk', label: 'Buffalo Milk' },
  { href: '/paneer', label: 'Paneer' },
  { href: '/curd', label: 'Curd' },
  { href: '/ghee', label: 'Ghee' },
  { href: '/dairy-products', label: 'All Dairy Products' },
];

export function Header() {
  const { user, profile, loading, signOut } = useAuth();
  const { items } = useCart();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => setMenuOpen(false));
  useOnClickOutside(categoriesRef, () => setCategoriesOpen(false));

  const cartCount = items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const displayName =
    profile?.full_name ||
    user?.email ||
    'Account';

  const initial =
    displayName.trim().charAt(0).toUpperCase() || 'U';

  const dashboardHref = profile
    ? homeRouteForRole(profile.role)
    : '/dashboard';

  const accountMenuItems = [
    ...(profile?.role === 'admin'
      ? [
          {
            href: '/admin',
            label: 'Admin Panel',
          },
          {
            href: '/admin/products',
            label: 'Product Management',
          },
        ]
      : []),

    {
      href: dashboardHref,
      label: 'My Dashboard',
    },
    {
      href: '/dashboard/orders',
      label: 'My Orders',
    },
    {
      href: '/dashboard/settings',
      label: 'Profile & Settings',
    },
    {
      href: '/dashboard/addresses',
      label: 'Addresses',
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
    },
    {
      href: '/dashboard/support',
      label: 'Support',
    },
  ];

  function closeMobileMenu() {
    setMobileOpen(false);
    setMobileCategoriesOpen(false);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    setMenuOpen(false);
    setMobileOpen(false);
    setCategoriesOpen(false);
    setMobileCategoriesOpen(false);

    try {
      await signOut();

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
    }
  }

  return (
    <header className="site-header">
      {/* Top information bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <span>Fresh milk & dairy products</span>

          <span className="topbar-sub">
            Serving selected areas of Latur District
          </span>
        </div>
      </div>

      {/* Main navigation */}
      <div className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Pandurang Milk Product Home"
            className="logo"
          >
            <Image
              src="/logo.png"
              alt="Pandurang Milk Product"
              width={44}
              height={44}
              className="logo-mark"
              priority
            />

            <div className="logo-text">
              <span className="logo-main">
                Pandurang
              </span>

              <span className="logo-sub">
                Milk Product
              </span>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav
            className="nav-links"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
              >
                {link.label}
              </Link>
            ))}

            {/* Categories */}
            <div
              ref={categoriesRef}
              className="category-menu"
            >
              <button
                type="button"
                onClick={() =>
                  setCategoriesOpen(
                    (value) => !value,
                  )
                }
                aria-haspopup="menu"
                aria-expanded={categoriesOpen}
                className="nav-link category-button"
              >
                Categories

                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={
                    categoriesOpen
                      ? 'rotate-180'
                      : ''
                  }
                />
              </button>

              {categoriesOpen && (
                <div
                  role="menu"
                  className="category-dropdown"
                >
                  {CATEGORY_LINKS.map(
                    (category) => (
                      <Link
                        key={category.href}
                        href={category.href}
                        role="menuitem"
                        onClick={() =>
                          setCategoriesOpen(false)
                        }
                        className="category-item"
                      >
                        {category.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop actions */}
          <div className="header-actions">
            {/* Cart */}
            <Link
              href="/cart"
              className="header-cart"
              aria-label={`Cart${
                cartCount > 0
                  ? `, ${cartCount} items`
                  : ''
              }`}
            >
              <ShoppingCart
                size={19}
                aria-hidden="true"
              />

              <span>Cart</span>

              {cartCount > 0 && (
                <span className="cart-count">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Account */}
            {loading ? (
              <div className="account-loading">
                Loading...
              </div>
            ) : user && profile ? (
              <div
                ref={menuRef}
                className="account-wrapper"
              >
                <button
                  type="button"
                  onClick={() =>
                    setMenuOpen(
                      (value) => !value,
                    )
                  }
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="account-button"
                >
                  <span className="account-avatar">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="account-avatar-image"
                      />
                    ) : (
                      initial
                    )}
                  </span>

                  <span className="account-name">
                    {displayName}
                  </span>

                  <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className={
                      menuOpen
                        ? 'rotate-180'
                        : ''
                    }
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="account-dropdown"
                  >
                    <div className="account-info">
                      <p>
                        {displayName}
                      </p>

                      <span>
                        {roleLabel(
                          profile.role,
                        )}
                      </span>
                    </div>

                    {accountMenuItems.map(
                      (item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() =>
                            setMenuOpen(false)
                          }
                          className="account-item"
                        >
                          {item.label}
                        </Link>
                      ),
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="logout-button"
                    >
                      {loggingOut
                        ? 'Signing out...'
                        : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-actions">
                <Link
                  href="/auth/login"
                  className="login-button"
                >
                  Login
                </Link>

                <Link
                  href="/auth/register"
                  className="register-button"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile actions */}
          <div className="mobile-actions">
            <Link
              href="/cart"
              className="mobile-cart"
              aria-label={`Cart${
                cartCount > 0
                  ? `, ${cartCount} items`
                  : ''
              }`}
            >
              <ShoppingCart
                size={20}
                aria-hidden="true"
              />

              {cartCount > 0 && (
                <span className="mobile-cart-count">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  (value) => !value,
                )
              }
              aria-label={
                mobileOpen
                  ? 'Close menu'
                  : 'Open menu'
              }
              aria-expanded={mobileOpen}
              className="mobile-menu-button"
            >
              {mobileOpen ? (
                <X size={23} />
              ) : (
                <Menu size={23} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileOpen && (
        <div className="mobile-menu">
          <nav
            aria-label="Mobile navigation"
            className="mobile-nav"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="mobile-nav-item"
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile categories */}
            <button
              type="button"
              onClick={() =>
                setMobileCategoriesOpen(
                  (value) => !value,
                )
              }
              aria-expanded={
                mobileCategoriesOpen
              }
              className="mobile-category-button"
            >
              <span>Categories</span>

              <ChevronDown
                size={18}
                className={
                  mobileCategoriesOpen
                    ? 'rotate-180'
                    : ''
                }
              />
            </button>

            {mobileCategoriesOpen && (
              <div className="mobile-categories">
                {CATEGORY_LINKS.map(
                  (category) => (
                    <Link
                      key={category.href}
                      href={category.href}
                      onClick={closeMobileMenu}
                      className="mobile-category-item"
                    >
                      {category.label}
                    </Link>
                  ),
                )}
              </div>
            )}

            <div className="mobile-divider" />

            {/* Mobile account */}
            {loading ? (
              <div className="mobile-loading">
                Loading...
              </div>
            ) : user && profile ? (
              <>
                <div className="mobile-account">
                  <span className="mobile-account-avatar">
                    {initial}
                  </span>

                  <div>
                    <p>
                      {displayName}
                    </p>

                    <span>
                      {roleLabel(
                        profile.role,
                      )}
                    </span>
                  </div>
                </div>

                {accountMenuItems.map(
                  (item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className="mobile-nav-item"
                    >
                      {item.label}
                    </Link>
                  ),
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="mobile-logout"
                >
                  {loggingOut
                    ? 'Signing out...'
                    : 'Logout'}
                </button>
              </>
            ) : (
              <div className="mobile-auth">
                <Link
                  href="/auth/login"
                  onClick={closeMobileMenu}
                  className="mobile-login"
                >
                  Login
                </Link>

                <Link
                  href="/auth/register"
                  onClick={closeMobileMenu}
                  className="mobile-register"
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