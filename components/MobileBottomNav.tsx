'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { buildWhatsAppUrl, WHATSAPP_GENERAL_MESSAGE } from '@/lib/whatsapp-link';
import { WhatsAppIcon } from './WhatsAppFloatingButton';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const whatsappUrl = buildWhatsAppUrl(WHATSAPP_GENERAL_MESSAGE);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Primary"
    >
      <NavTab href="/" label="Home" active={isActive('/')}>
        <Home size={20} />
      </NavTab>
      <NavTab href="/products" label="Shop" active={isActive('/products')}>
        <ShoppingBag size={20} />
      </NavTab>
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with Pandurang Milk Product on WhatsApp"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[#25D366]"
        >
          <WhatsAppIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">WhatsApp</span>
        </a>
      )}
      <NavTab
        href={user ? '/dashboard' : '/auth/login'}
        label={user && profile ? profile.full_name.split(' ')[0] : 'Login'}
        active={isActive('/dashboard') || isActive('/auth')}
      >
        <User size={20} />
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
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0 ${
        active ? 'text-brand-700' : 'text-gray-500'
      }`}
    >
      {children}
      <span className="text-[10px] font-medium truncate max-w-full px-1">{label}</span>
    </Link>
  );
}
