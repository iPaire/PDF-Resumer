'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { analyticsEvents } from '@/lib/analytics';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const t = useTranslations('common');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculează zilele rămase pentru trial
  useEffect(() => {
    if (session?.user?.subscription === 'trial' && session.user.trialExpires) {
      const now = new Date();
      const trialExpires = new Date(session.user.trialExpires);
      const diffTime = trialExpires.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysLeft(diffDays);
    }
  }, [session]);

  // Loading state
  if (status === 'loading') {
    return (
      <nav className="bg-white shadow-md py-4 px-6 flex justify-between items-center w-full">
        <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-800">
          SmartPDF Notes
        </Link>
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-md py-4 px-6 flex justify-between items-center w-full">
      <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-800">
        SmartPDF Notes
      </Link>

      <div className="flex items-center space-x-2 md:space-x-4">
        <Link 
          href="/" 
          onClick={() => analyticsEvents.navigationClick('home', 'navbar')}
          className="text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition hidden sm:block"
        >
          {t('home')}
        </Link>
        
        {/* Buton de Upload între Acasă și Prețuri */}
        {session && (
          <Link 
            href="/upload" 
            onClick={() => analyticsEvents.navigationClick('upload', 'navbar')}
            className="text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">{t('upload')}</span>
          </Link>
        )}

        <Link 
          href="/pricing" 
          onClick={() => analyticsEvents.navigationClick('pricing', 'navbar')}
          className="text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition hidden sm:block"
        >
          {t('pricing')}
        </Link>

        {session ? (
          <div ref={menuRef} className="relative">
            <button 
              onClick={() => setOpen(!open)} 
              className="cursor-pointer focus:outline-none flex items-center hover:opacity-90 ml-2"
              aria-label="Profile menu"
            >
              {session.user?.image ? (
                <Image
                  src={session.user.image}
                  alt="Profil"
                  width={36}
                  height={36}
                  className="rounded-full border"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              ) : (
                <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center text-gray-700">
                  {session.user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border z-50 max-w-[90vw]">
                <div className="px-4 py-3 text-sm text-gray-700 border-b">
                  <p className="font-medium truncate">{session.user?.name}</p>
                  <p className="text-xs truncate mt-1">{session.user?.email}</p>
                  
                  {/* Afișează abonamentul curent */}
                  <div className="mt-2 flex items-center">
                    <span className="font-medium mr-2">Plan:</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      session.user.subscription === 'free' 
                        ? 'bg-gray-200 text-gray-800' 
                        : session.user.subscription === 'standard' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                    }`}>
                      {session.user.subscription === 'free' 
                        ? t('free')
                        : session.user.subscription === 'standard' 
                          ? t('standard')
                          : session.user.subscription === 'trial'
                          ? `${t('premium')} Trial`
                          : t('premium')}
                    </span>
                  </div>
                  
                  {/* Afișează zilele rămase pentru trial */}
                  {session.user.subscription === 'trial' && daysLeft !== null && (
                    <div className="mt-1 text-xs text-purple-600">
                      {daysLeft > 0 
                        ? `Expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`
                        : 'Trial expired'}
                    </div>
                  )}
                </div>
                
                {/* Buton Upgrade pentru utilizatorii Free */}
                {(session.user.subscription === 'free' || session.user.subscription === 'trial') && (
                  <Link
                    href="/pricing"
                    className="block text-center mx-2 my-2 px-3 py-2 text-sm font-medium bg-yellow-500 text-white hover:bg-yellow-600 rounded transition"
                    onClick={() => {
                      setOpen(false);
                      analyticsEvents.buttonClick('upgrade_plan', 'navbar');
                    }}
                  >
                    Upgrade Plan Now
                  </Link>
                )}

                <Link
                  href={session.user.subscription === 'free' ? "/summaries" : "/dashboard"}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  {session.user.subscription === 'free' ? t('summaries') : t('dashboard')}
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  {t('settings')}
                </Link>
                <button
                  onClick={() => {
                    analyticsEvents.userLogout();
                    signOut({ callbackUrl: '/' });
                  }}
                  className="cursor-pointer w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm md:text-base"
          >
            {t('login')}
          </Link>
        )}
      </div>
    </nav>
  );}