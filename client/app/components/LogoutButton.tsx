'use client';

import { signOut } from 'next-auth/react';
import { analyticsEvents } from '@/lib/analytics';

export default function LogoutButton() {
  const handleLogout = () => {
    // Track logout event
    analyticsEvents.userLogout();
    signOut({ callbackUrl: '/' });
  };

  return (
    <button
      onClick={handleLogout}
      className="text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 transition"
    >
      Deconectare
    </button>
  );
}