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

// Mapeo de idiomas a monedas
export const LOCALE_TO_CURRENCY = {
  'en': 'usd',
  'ro': 'ron',
  'es': 'eur',
  'de': 'eur',
  'fr': 'eur',
};

// ID-uri de preț pentru cada moneda
const PRICE_IDS_BY_CURRENCY = {
  usd: {
    PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID_USD || '',
    PREMIUM_ANNUAL: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID_USD || '',
  },
  eur: {
    PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID_EUR || '',
    PREMIUM_ANNUAL: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID_EUR || '',
  },
  ron: {
    PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID_RON || '',
    PREMIUM_ANNUAL: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID_RON || '',
  },
};

// Función para obtener los price IDs según el idioma
export const getPriceIdsByLocale = (locale) => {
  const currency = LOCALE_TO_CURRENCY[locale] || 'eur'; // Default a EUR
  return PRICE_IDS_BY_CURRENCY[currency];
};

// ID-uri de preț din variabile de mediu (Legacy - mantenidos para compatibilidad)
export const PRICE_IDS = {
  PREMIUM_ANNUAL: process.env.STRIPE_PREMIUM_ANUAL_PRICE_ID || '',
  PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID || '',
};

// Exportar todos los price IDs para validación
export const getAllValidPriceIds = () => {
  const allIds = [];
  Object.values(PRICE_IDS_BY_CURRENCY).forEach(currency => {
    Object.values(currency).forEach(id => {
      if (id) allIds.push(id);
    });
  });
  return allIds;
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