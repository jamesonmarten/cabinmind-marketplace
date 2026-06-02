import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Header() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '/demo',    label: 'Try It Free', accent: true },
    { href: '/pricing', label: 'Pricing'        },
    { href: '/agency',  label: 'For Agencies'   },
    { href: '/compare', label: 'Compare' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-lg shadow-black/30' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            {/* CM badge */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
              <span className="text-white font-bold text-sm">CM</span>
            </div>
            {/* Product name */}
            <span className="text-white font-semibold text-lg tracking-tight leading-none">
              Cabin<span className="gradient-text">Mind</span>
            </span>
          </Link>
          {/* Divider */}
          <span className="hidden sm:block text-white/20 text-lg font-thin select-none">|</span>
          {/* Made-by lockup — links to devcabin.tech */}
          <a
            href="https://devcabin.tech?utm_source=productsDemo"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 group"
          >
            <span className="text-gray-500 text-[10px] uppercase tracking-widest leading-none">made by</span>
            <Image
              src="/dev-cabin-logo.jpg"
              alt="Dev Cabin Technologies"
              width={30}
              height={30}
              className="rounded-sm opacity-90 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-gray-400 text-xs font-medium leading-none hidden lg:inline group-hover:text-white transition-colors">
              Dev Cabin Technologies
            </span>
          </a>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label, accent }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                router.pathname.startsWith(href)
                  ? 'text-white'
                  : accent
                  ? 'text-brand-400 hover:text-brand-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {accent && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              )}
              {label}
            </Link>
          ))}
          <Link
            href="/demo"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/30"
          >
            Get Leads Free →
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-300 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="w-6 flex flex-col gap-1.5">
            <span className={`block h-0.5 bg-current transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 bg-current transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-current transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/10 px-4 py-4 flex flex-col gap-4">
          {navLinks.map(({ href, label, accent }) => (
            <Link
              key={href}
              href={href}
              className={`font-medium flex items-center gap-2 ${
                router.pathname.startsWith(href) ? 'text-white' : accent ? 'text-brand-400' : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {accent && <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}
              {label}
            </Link>
          ))}
          <Link
            href="/demo"
            onClick={() => setMenuOpen(false)}
            className="mt-1 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white text-sm font-bold text-center hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/30"
          >
            Get Leads Free →
          </Link>
        </div>
      )}
    </header>
  );
}