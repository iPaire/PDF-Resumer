"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PRICE_IDS, getClientStripe } from '@/lib/stripe';

export default function PricingPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleCheckout = async (priceId) => {
    if (!session) {
      router.push('/login');
      return;
    }

    setSelectedPlan(priceId);
    
    try {
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const stripe = await getClientStripe();
      
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Eroare: ' + error.message);
    } finally {
      setSelectedPlan(null);
    }
  };

  const handleFreePlan = () => {
    router.push(session ? '/upload' : '/login');
  };

  const isLoading = (plan) => selectedPlan === plan;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 py-8 px-4 sm:py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12 text-blue-600">
          Planuri de abonament
        </h1>

        {isMobile ? (
          <div className="space-y-6">
            {/* Plan gratuit */}
            <div className="bg-white shadow-lg rounded-xl p-5 border border-gray-300">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Gratuit</h2>
              <p className="text-gray-600 mb-3 text-sm">Ideal pentru testare rapidă.</p>
              <ul className="text-sm text-gray-700 list-disc ml-5 mb-4 space-y-1">
                <li>3 PDF-uri/lună</li>
                <li>Rezumat AI</li>
                <li>Teste grilă</li>
              </ul>
              <p className="font-bold text-gray-800 text-lg mb-4">€0 / lună</p>
              <button 
                onClick={handleFreePlan}
                className="w-full py-2 px-4 rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-300 hover:text-white"
              >
                Începe acum
              </button>
            </div>

            {/* Plan standard */}
            <div className="bg-white shadow-lg rounded-xl p-5 border-2 border-blue-500">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Standard</h2>
              <p className="text-gray-600 mb-3 text-sm">Pentru studenți activi.</p>
              <ul className="text-sm text-gray-700 list-disc ml-5 mb-4 space-y-1">
                <li>50 PDF-uri/lună</li>
                <li>Rezumat AI + Teste grilă</li>
                <li>Generare quiz-uri personalizate</li>
              </ul>
              <p className="font-bold text-gray-800 text-lg mb-4">€5 / lună</p>
              <button 
                onClick={() => handleCheckout(PRICE_IDS.STANDARD)}
                disabled={isLoading(PRICE_IDS.STANDARD)}
                className={`w-full py-2 px-4 rounded-lg border font-medium 
                  ${isLoading(PRICE_IDS.STANDARD)
                    ? 'bg-blue-300 cursor-not-allowed text-white'
                    : 'text-blue-500 border-blue-500 hover:bg-blue-500 hover:text-white'}`}
              >
                {isLoading(PRICE_IDS.STANDARD) ? 'Procesare...' : 'Alege Standard'}
              </button>
            </div>

            {/* Plan premium */}
            <div className="relative">
              <div className="absolute -top-3 right-4 bg-yellow-500 text-white px-3 py-1 rounded-lg font-bold z-10 transform rotate-3 shadow-md text-xs">
                POPULAR
              </div>
              <div className="bg-white shadow-xl rounded-xl p-5 border-2 border-yellow-500">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Premium</h2>
                <p className="text-gray-600 mb-3 text-sm">Maximizează învățarea.</p>
                <ul className="text-sm text-gray-700 list-disc ml-5 mb-4 space-y-1">
                  <li>200 PDF-uri/lună</li>
                  <li>Tot ce este în Standard</li>
                  <li>Profesor AI (video lecții personalizate)</li>
                </ul>
                <p className="font-bold text-gray-800 text-lg mb-4">€10 / lună</p>
                <button 
                  onClick={() => handleCheckout(PRICE_IDS.PREMIUM)}
                  disabled={isLoading(PRICE_IDS.PREMIUM)}
                  className={`w-full py-2 px-4 rounded-lg border font-medium 
                    ${isLoading(PRICE_IDS.PREMIUM)
                      ? 'bg-yellow-300 cursor-not-allowed text-white'
                      : 'text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-white'}`}
                >
                  {isLoading(PRICE_IDS.PREMIUM) ? 'Procesare...' : 'Alege Premium'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan gratuit */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-300 transition-all hover:shadow-xl">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Gratuit</h2>
              <p className="text-gray-600 mb-4">Ideal pentru testare rapidă.</p>
              <ul className="text-sm text-gray-700 list-disc ml-5 mb-4 space-y-2">
                <li>3 PDF-uri/lună</li>
                <li>Limitare 10MB</li>
                <li>Intrebări de autoevaluare</li>
              </ul>
              <p className="font-bold text-gray-800 text-lg mb-6">€0 / lună</p>
              <button 
                onClick={handleFreePlan}
                className="w-full py-3 px-4 rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-300 hover:text-white"
              >
                Începe acum
              </button>
            </div>

            {/* Plan standard */}
            <div className="bg-white shadow-lg rounded-xl p-6 border-2 border-blue-500 transition-all hover:shadow-xl">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Standard</h2>
              <p className="text-gray-600 mb-4">Pentru studenți activi.</p>
              <ul className="text-sm text-gray-700 list-disc ml-5 mb-4 space-y-2">
                <li>50 PDF-uri/lună</li>
                <li>Limitare 50MB</li>
                <li>Quiz 5 intrebări</li>
              </ul>
              <p className="font-bold text-gray-800 text-lg mb-6">€5 / lună</p>
              <button 
                onClick={() => handleCheckout(PRICE_IDS.STANDARD)}
                disabled={isLoading(PRICE_IDS.STANDARD)}
                className={`w-full py-3 px-4 rounded-lg border font-medium 
                  ${isLoading(PRICE_IDS.STANDARD)
                    ? 'bg-blue-300 cursor-not-allowed text-white'
                    : 'text-blue-500 border-blue-500 hover:bg-blue-500 hover:text-white'}`}
              >
                {isLoading(PRICE_IDS.STANDARD) ? 'Procesare...' : 'Alege Standard'}
              </button>
            </div>

            {/* Plan premium */}
            <div className="relative md:col-span-2">
              <div className="absolute -top-3 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold z-10 transform rotate-3 shadow-md">
                POPULAR
              </div>
              <div className="bg-white shadow-xl rounded-xl p-6 border-2 border-yellow-500 transition-all hover:shadow-2xl">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Premium</h2>
                <p className="text-gray-600 mb-4">Maximizează învățarea.</p>
                <ul className="text-sm text-gray-700 list-disc ml-5 mb-4 space-y-2">
                  <li>200 PDF-uri/lună</li>
                  <li>Limitare 250MB</li>
                  <li>Quiz 20 intrebări</li>
                <li>Răspunsuri și rezumate cu AI avansat</li>
                </ul>
                <p className="font-bold text-gray-800 text-lg mb-6">€10 / lună</p>
                <button 
                  onClick={() => handleCheckout(PRICE_IDS.PREMIUM)}
                  disabled={isLoading(PRICE_IDS.PREMIUM)}
                  className={`w-full py-3 px-4 rounded-lg border font-medium 
                    ${isLoading(PRICE_IDS.PREMIUM)
                      ? 'bg-yellow-300 cursor-not-allowed text-white'
                      : 'text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-white'}`}
                >
                  {isLoading(PRICE_IDS.PREMIUM) ? 'Procesare...' : 'Alege Premium'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-10 sm:mt-12 text-center text-gray-600">
          <p className="mb-3 sm:mb-4 text-sm sm:text-base">✅ Toate planurile includ:</p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <span className="bg-gray-100 px-2 py-1 sm:px-3 sm:py-1 rounded-full">Rezumat Ai</span>
            <span className="bg-gray-100 px-2 py-1 sm:px-3 sm:py-1 rounded-full">Export PDF/Word</span>
            <span className="bg-gray-100 px-2 py-1 sm:px-3 sm:py-1 rounded-full">Suport tehnic</span>
            <span className="bg-gray-100 px-2 py-1 sm:px-3 sm:py-1 rounded-full">Actualizări gratuite</span>
          </div>
          <p className="mt-4 text-xs text-gray-500">Prețurile sunt exprimate în euro și pot include TVA</p>
        </div>
      </div>
    </div>
  );
}