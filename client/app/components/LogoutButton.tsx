'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 transition"
    >
      Deconectare
    </button>
  );
}