'use client';

import { signOut } from 'next-auth/react';
import { analyticsEvents } from '@/lib/analytics';

export default function LogoutButton() {
  const handleLogout = async () => {
    // Track logout event
    analyticsEvents.userLogout();
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
    // Forțează refresh pentru clear cache complet
    window.location.href = '/';
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