// app/page.tsx
'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            Transformă documentele în <span className="text-blue-600">cunoștințe</span>
          </h1>
          
          <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
            SmartPDF Notes extrage automat rezumate, teste și lecții personalizate din materialele tale educaționale
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            {status === 'authenticated' ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/upload"
                  className="px-8 py-3 bg-white text-blue-600 border border-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
                >
                  Rezumat PDF
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Autentificare
                </Link>
                <Link
                  href="/register"
                  className="px-8 py-3 bg-white text-blue-600 border border-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
                >
                  Înregistrare
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Cum funcționează
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-xl text-gray-600">
              Doar 3 pași simpli pentru a transforma documentele în materiale de învățare
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-2xl font-bold">1</span>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">Încarcă PDF</h3>
                <p className="mt-2 text-gray-600">
                  Încarcă materialele didactice, cursurile sau prezentările
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-2xl font-bold">2</span>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">AI procesează</h3>
                <p className="mt-2 text-gray-600">
                  Sistemul nostru extrage conceptele cheie și le structurează
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-2xl font-bold">3</span>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">Obține rezultate</h3>
                <p className="mt-2 text-gray-600">
                  Primești rezumat, teste și materiale de studiu personalizate
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}