import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import type { AppPage, User } from '../types';

interface NavbarProps {
  currentPage: AppPage;
  user: User | null;
  onNavigate: (page: AppPage, hash?: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onLogout: () => void;
}

export function Navbar({ currentPage, user, onNavigate, onOpenAuth, onLogout }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: AppPage, hash?: string) => {
    setMobileOpen(false);
    onNavigate(page, hash);
  };

  const dashboardPage: AppPage =
    user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
      ? 'admin'
      : user?.role === 'EDUCATOR'
      ? 'educator'
      : 'dashboard';

  const dashboardLabel =
    user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
      ? 'Admin Panel'
      : user?.role === 'EDUCATOR'
      ? 'Educator Studio'
      : 'Dashboard';

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
      active
        ? 'text-[#4338CA] border-[#4338CA]'
        : 'text-[#1E1B4B]/75 border-transparent hover:text-[#4338CA] hover:border-[#4338CA]/30'
    }`;

  return (
    <header className="sticky top-0 z-40 no-print bg-[#F8FAFC]/85 backdrop-blur-md border-b border-[#1E1B4B]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Mark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4338CA] rounded-lg"
          aria-label="EduGenius AI Home"
        >
          <Logo size="md" />
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Primary Navigation">
          <button type="button" onClick={() => handleNav('home')} className={navLinkClass(currentPage === 'home')}>
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNav('study-hub')}
            className={navLinkClass(currentPage === 'study-hub')}
          >
            AI Study Hub
          </button>
          <button
            type="button"
            onClick={() => handleNav('smart-quiz')}
            className={navLinkClass(currentPage === 'smart-quiz')}
          >
            Smart Quiz
          </button>
          <button
            type="button"
            onClick={() => handleNav('live-tutor')}
            className={navLinkClass(currentPage === 'live-tutor')}
          >
            Live Tutor
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', '#pricing')}
            className={navLinkClass(false)}
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', '#about')}
            className={navLinkClass(false)}
          >
            About
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={onLogout}
                className="text-sm font-medium text-[#1E1B4B]/70 hover:text-[#1E1B4B] transition-colors whitespace-nowrap shrink-0"
              >
                Logout
              </button>
              <button
                type="button"
                onClick={() => handleNav(dashboardPage)}
                className="px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                {dashboardLabel}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="text-sm font-semibold text-[#1E1B4B]/80 hover:text-[#4338CA] transition-colors whitespace-nowrap shrink-0"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                Try AI Free
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="lg:hidden p-2 rounded-lg text-[#1E1B4B] hover:bg-[#1E1B4B]/5 transition-colors"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#1E1B4B]/10 bg-white px-4 py-4 space-y-2 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E1B4B] hover:bg-[#4338CA]/8"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNav('study-hub')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E1B4B] hover:bg-[#4338CA]/8"
            >
              AI Study Hub
            </button>
            <button
              type="button"
              onClick={() => handleNav('smart-quiz')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E1B4B] hover:bg-[#4338CA]/8"
            >
              Smart Quiz
            </button>
            <button
              type="button"
              onClick={() => handleNav('live-tutor')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E1B4B] hover:bg-[#4338CA]/8"
            >
              Live Tutor
            </button>
            <button
              type="button"
              onClick={() => handleNav('home', '#pricing')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E1B4B] hover:bg-[#4338CA]/8"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => handleNav('home', '#about')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E1B4B] hover:bg-[#4338CA]/8"
            >
              About
            </button>
          </div>
          <div className="pt-3 border-t border-[#1E1B4B]/10 flex items-center gap-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav(dashboardPage)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#4338CA] text-white text-sm font-semibold"
                >
                  {dashboardLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#1E1B4B]/15 text-sm font-medium text-[#1E1B4B]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth('login');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#1E1B4B]/15 text-sm font-semibold text-[#1E1B4B]"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth('register');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#4338CA] text-white text-sm font-semibold"
                >
                  Try AI Free
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
