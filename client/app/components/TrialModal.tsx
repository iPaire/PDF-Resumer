'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTrial } from '@/context/TrialContext'

const TrialModal = () => {
  const { data: session, update } = useSession()
  const { showTrialModal, setShowTrialModal } = useTrial()
  const [isLoading, setIsLoading] = useState(false)
  
  // Verificăm dacă trebuie afișat modalul
  useEffect(() => {
    if (session?.user && !session.user.trialOffered && session.user.subscription === 'free') {
      setShowTrialModal(true)
    }
  }, [session, setShowTrialModal])

  const activateTrial = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/activate-trial', {
        method: 'POST'
      })
      
      if (response.ok) {
        // Actualizăm sesiunea și închidem modalul
        await update()
        setShowTrialModal(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to activate trial')
      }
    } catch (error) {
      console.error('Activation error:', error)
      alert('A apărut o eroare. Vă rugăm încercați din nou.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!showTrialModal) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Încearcă Premium gratuit</h3>
            <button 
              onClick={() => setShowTrialModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Bun venit! Primești 7 zile de acces gratuit la toate funcțiile Premium:
            </p>
            
            <ul className="space-y-2">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Acces nelimitat la toate funcțiile</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Generare de rezumate și teste grilă nelimitate</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Export în PDF și Word</span>
              </li>
            </ul>
            
            <div className="pt-4">
              <button
                onClick={activateTrial}
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-medium text-white ${
                  isLoading ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
                } transition-colors`}
              >
                {isLoading ? 'Se procesează...' : 'Începe trial gratuit'}
              </button>
              
              <button
                onClick={() => setShowTrialModal(false)}
                className="w-full py-3 mt-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Mai târziu
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 text-sm text-gray-500">
          După 7 zile, abonamentul tău va reveni automat la planul gratuit. Nu sunt comisioane ascunse.
        </div>
      </div>
    </div>
  )
}

export default TrialModal