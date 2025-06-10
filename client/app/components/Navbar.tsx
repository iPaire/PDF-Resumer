// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Loading state
  if (status === 'loading') {
    return (
      <nav className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-800">
          SmartPDF Notes
        </Link>
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-800">
        SmartPDF Notes
      </Link>

      <div className="flex items-center space-x-6 relative">
        <Link href="/" className="text-gray-700 hover:text-blue-600 transition">Acasă</Link>
        <Link href="/pricing" className="text-gray-700 hover:text-blue-600 transition">Prețuri</Link>

        {session ? (
          <div ref={menuRef} className="relative">
            <button 
              onClick={() => setOpen(!open)} 
              className="cursor-pointer focus:outline-none flex items-center hover:opacity-90"
              aria-label="Profile menu"
            >
              {session.user?.image ? (
                <Image
                  src={session.user.image}
                  alt="Profil"
                  width={40}
                  height={40}
                  className="rounded-full border"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-700">
                  {session.user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-50">
                <div className="px-4 py-3 text-sm text-gray-700 border-b">
                  <p className="font-medium">{session.user?.name}</p>
                  <p className="text-xs truncate">{session.user?.email}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  Setări cont
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="cursor-pointer w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Deconectare
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Autentificare
          </Link>
        )}
      </div>
    </nav>
  );
}