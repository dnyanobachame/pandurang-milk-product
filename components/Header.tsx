import Link from 'next/link';
import Image from 'next/image';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/dashboard', label: 'Track Order' },
  { href: '/contact', label: 'Contact Us' },
];

export function Header() {
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

          <nav className="nav-links">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <Link href="/cart" className="cart-btn">
            Cart
          </Link>
        </div>
      </div>
    </header>
  );
}
