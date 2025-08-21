// lib/stripe.js
import Stripe from 'stripe';

// Inițializare instanță Stripe cu verificare robustă
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey && typeof window === 'undefined') {
  // Doar log în modul server-side și development
  if (process.env.NODE_ENV === 'development') {
    console.warn('STRIPE_SECRET_KEY lipsește din variabilele de mediu!');
  }
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

// ID-uri de preț din variabile de mediu
export const PRICE_IDS = {
  PREMIUM_ANNUAL: process.env.STRIPE_PREMIUM_ANUAL_PRICE_ID || '',
  //STANDARD: process.env.STRIPE_STANDARD_PRICE_ID || '',
  PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID || '',
};

// Funcție utilitară pentru încărcarea Stripe pe client
let stripePromise = null;

export const getClientStripe = async () => {
  if (typeof window === 'undefined') {
    return null; // Return null on server-side
  }

  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/stripe-js');
    
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY lipsește din variabilele de mediu!');
      }
      return null;
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};