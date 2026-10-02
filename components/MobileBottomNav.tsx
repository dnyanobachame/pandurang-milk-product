'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Home,
  ShoppingBag,
  User,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';

export function MobileBottomNav() {
  const pathname = usePathname();

  const { user, profile } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const userLabel =
    user && profile
      ? profile.full_name?.trim().split(/\s+/)[0] || 'Account'
      : 'Login';

  const accountActive =
    isActive('/dashboard') ||
    isActive('/auth');

  return (
    <nav
      className="
        mobile-bottom-nav
        md:hidden
        fixed
        bottom-0
        left-0
        right-0
        z-50
        flex
        w-full
        max-w-full
        min-w-0
        items-stretch
        overflow-hidden
        border-t
        border-gray-200
        bg-white
        shadow-[0_-4px_16px_rgba(0,0,0,0.06)]
      "
      style={{
        paddingBottom:
          'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Primary navigation"
    >
      <NavTab
        href="/"
        label="Home"
        active={isActive('/')}
      >
        <Home
          size={21}
          strokeWidth={isActive('/') ? 2.5 : 2}
        />
      </NavTab>

      <NavTab
        href="/products"
        label="Shop"
        active={isActive('/products')}
      >
        <ShoppingBag
          size={21}
          strokeWidth={
            isActive('/products') ? 2.5 : 2
          }
        />
      </NavTab>

      <NavTab
        href={
          user
            ? '/dashboard'
            : '/auth/login'
        }
        label={userLabel}
        active={accountActive}
      >
        <User
          size={21}
          strokeWidth={
            accountActive ? 2.5 : 2
          }
        />
      </NavTab>
    </nav>
  );
}

function NavTab({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={
        active ? 'page' : undefined
      }
      className={`
        flex
        min-h-[60px]
        min-w-0
        flex-1
        shrink
        flex-col
        items-center
        justify-center
        gap-1
        overflow-hidden
        px-1
        py-2
        transition-colors
        active:bg-gray-50
        ${
          active
            ? 'text-brand-700'
            : 'text-gray-500'
        }
      `}
    >
      <span
        className={`
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-full
          ${
            active
              ? 'bg-green-50'
              : ''
          }
        `}
      >
        {children}
      </span>

      <span
        className="
          block
          max-w-full
          truncate
          px-1
          text-[10px]
          font-semibold
          leading-none
        "
      >
        {label}
      </span>
    </Link>
  );
}