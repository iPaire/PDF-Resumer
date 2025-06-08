// app/reset-password/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter token, 3 = enter new password
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!email) {
      setError('Te rugăm să introduci adresa de email');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Eroare la trimiterea codului');
      }

      setSuccess('Un cod de verificare a fost trimis pe email!');
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Eroare la trimiterea codului');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!token) {
      setError('Te rugăm să introduci codul primit');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cod invalid sau expirat');
      }

      setSuccess('Cod verificat cu succes!');
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Eroare la verificarea codului');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (password !== confirmPassword) {
      setError('Parolele nu coincid');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Eroare la resetarea parolei');
      }

      setSuccess('Parola a fost resetată cu succes!');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Eroare la resetarea parolei');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-md rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
          {step === 1 && 'Resetare parolă'}
          {step === 2 && 'Verifică codul'}
          {step === 3 && 'Setează parolă nouă'}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-center">
            {success}
          </div>
        )}

        {/* Step 1: Enter email */}
        {step === 1 && (
          <form onSubmit={handleSendToken}>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Introdu adresa de email asociată contului tău pentru a primi un cod de verificare.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@exemplu.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-semibold py-2 rounded-md transition flex items-center justify-center`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Se încarcă...
                </>
              ) : (
                'Trimite codul'
              )}
            </button>
          </form>
        )}

        {/* Step 2: Enter token */}
        {step === 2 && (
          <form onSubmit={handleVerifyToken}>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Am trimis un cod de 6 cifre pe adresa <span className="font-semibold">{email}</span>. 
                Te rugăm să-l introduci mai jos.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cod de verificare</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-widest"
                  placeholder="123456"
                  required
                  maxLength={6}
                />
              </div>
              
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Schimbă adresa de email
                </button>
                
                <div className="mt-2">
                  <button 
                    type="button" 
                    onClick={handleSendToken}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Retrimite codul
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-semibold py-2 rounded-md transition flex items-center justify-center`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Se încarcă...
                </>
              ) : (
                'Verifică codul'
              )}
            </button>
          </form>
        )}

        {/* Step 3: Enter new password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Parolă nouă</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">Minim 6 caractere</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmă parola</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-semibold py-2 rounded-md transition flex items-center justify-center`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Se încarcă...
                </>
              ) : (
                'Resetează parola'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link 
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Înapoi la autentificare
          </Link>
        </div>
      </div>
    </div>
  );
}