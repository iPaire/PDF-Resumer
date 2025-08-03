'use client'

import { createContext, useState, useContext, useEffect } from 'react'

const TrialContext = createContext({
  showTrialModal: false,
  setShowTrialModal: (show: boolean) => {},
})

export const TrialProvider = ({ children }: { children: React.ReactNode }) => {
  const [showTrialModal, setShowTrialModal] = useState(false)
  
  return (
    <TrialContext.Provider value={{ showTrialModal, setShowTrialModal }}>
      {children}
    </TrialContext.Provider>
  )
}

export const useTrial = () => useContext(TrialContext)