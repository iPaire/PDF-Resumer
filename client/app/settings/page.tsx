// app/settings/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { updateProfile, changePassword } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useTranslations } from 'next-intl';

// Definim tipurile pentru datele Stripe
type StripeInvoice = {
  id: string;
  created: number;
  amount_paid: number;
  currency: string;
  invoice_pdf: string;
};

type StripeSubscription = {
  id: string;
  status: string;
  current_period_end: number;
  items: {
    data: {
      price: {
        id: string;
      }
    }[]
  };
};

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  
  // Definim explicit tipurile pentru datele de facturare
  const [subscriptionDetails, setSubscriptionDetails] = useState<StripeSubscription | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>(session?.user?.subscription || 'free');
  const [hasPassword, setHasPassword] = useState<boolean>(false);

  // Inițializare plan curent din sesiune
  useEffect(() => {
    if (session?.user?.subscription) {
      setCurrentPlan(session.user.subscription);
    } else {
      setCurrentPlan('free');
    }
  }, [session]);

  // Check if user has password (email auth) vs OAuth
  useEffect(() => {
    const checkUserAuthMethod = async () => {
      if (!session?.user?.id) return;
      
      try {
        const res = await fetch(`/api/user/auth-method`);
        const data = await res.json();
        
        if (res.ok) {
          setHasPassword(data.hasPassword);
        }
      } catch (error) {
        console.error('Error checking auth method:', error);
      }
    };
    
    checkUserAuthMethod();
  }, [session]);

  // Fetch subscription details and invoices
  useEffect(() => {
    const fetchBillingData = async () => {
      if (!session?.user?.stripeCustomerId) return;
      
      try {
        const res = await fetch(`/api/settings/billing?customerId=${session.user.stripeCustomerId}`);
        const data = await res.json();
        
        if (res.ok) {
          // Setăm datele cu tipurile corecte
          setSubscriptionDetails(data.subscription as StripeSubscription);
          setInvoices(data.invoices as StripeInvoice[]);
          
          // Actualizează planul curent doar dacă există un abonament activ în Stripe
          if (data.subscription?.status === 'active') {
            // Determină planul bazat pe ID-ul produsului din Stripe
            const plan = getPlanFromPriceId(data.subscription?.items?.data[0]?.price?.id);
            if (plan) {
              setCurrentPlan(plan);
              
              // Actualizează sesiunea dacă planul a fost schimbat
              if (session.user.subscription !== plan) {
                await update({
                  ...session,
                  user: {
                    ...session.user,
                    subscription: plan
                  }
                });
              }
            }
          }
        } else {
          console.error('Error fetching billing data:', data.error);
        }
      } catch (error) {
        console.error('Error fetching billing data:', error);
      }
    };
    
    fetchBillingData();
  }, [session, update]);

  const getPlanFromPriceId = (priceId: string | undefined): string | null => {
    if (!priceId) return null;
    
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID) {
      return 'standard';
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID) {
      return 'premium';
    }
    return null;
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setProfileError('');
    setProfileSuccess('');
    
    try {
      const result = await updateProfile(formData);
      
      if (result?.error) {
        setProfileError(result.error);
      } else {
        // Update the session to reflect changes
        await update({
          ...session,
          user: {
            ...session?.user,
            name: formData.name,
            email: formData.email,
          }
        });
        setProfileSuccess(t('profileUpdated'));
      }
    } catch {
      setProfileError('Eroare la actualizarea profilului');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(t('passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    try {
      const result = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (result?.error) {
        setPasswordError(result.error);
      } else {
        setPasswordSuccess(t('passwordChanged'));
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      setPasswordError('Eroare la schimbarea parolei');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const response = await fetch('/api/settings/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: session?.user?.stripeCustomerId,
          returnUrl: window.location.href
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error redirecting to billing portal:', error);
      alert('Eroare la accesarea portalului de facturare');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleChangePlan = () => {
    router.push('/pricing');
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'free': return t('common.free');
      case 'standard': return t('common.standard');
      case 'premium': return t('common.premium');
      default: return plan;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {/* Profile Section */}
          <div className="px-6 py-5">
            <h2 className="text-xl font-semibold text-gray-900">{t('profile')}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('profileSubtitle')}
            </p>
            
            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  {t('name')}
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleProfileChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('email')}
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleProfileChange}
                  disabled={hasPassword}
                  className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    hasPassword ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
                  }`}
                />
                {hasPassword && (
                  <p className="mt-1 text-xs text-gray-500">
                    {t('emailCannotBeChanged')}
                  </p>
                )}
              </div>
              
              {profileError && (
                <div className="text-red-600 text-sm">{profileError}</div>
              )}
              
              {profileSuccess && (
                <div className="text-green-600 text-sm">{profileSuccess}</div>
              )}
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="cursor-pointer ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {isLoading ? t('saving') : t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
          
          {/* Password Section */}
          <div className="px-6 py-5">
            <h2 className="text-xl font-semibold text-gray-900">{t('changePassword')}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('passwordSubtitle')}
            </p>
            
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  {t('currentPassword')}
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  {t('newPassword')}
                </label>
                <input
                  type="password"
                  name="newPassword"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  {t('confirmNewPassword')}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              
              {passwordError && (
                <div className="text-red-600 text-sm">{passwordError}</div>
              )}
              
              {passwordSuccess && (
                <div className="text-green-600 text-sm">{passwordSuccess}</div>
              )}
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="cursor-pointer ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {isLoading ? t('updating') : t('changePassword')}
                </button>
              </div>
            </form>
          </div>
          
          {/* Billing Section */}
          <div className="px-6 py-5">
            <h2 className="text-xl font-semibold text-gray-900">{t('subscription')}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('subscriptionSubtitle')}
            </p>
            
            <div className="mt-6 space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('currentPlan')}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {getPlanName(currentPlan)}
                </p>
              </div>
              
              {subscriptionDetails && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-medium text-gray-900">{t('renewalDate')}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {subscriptionDetails.current_period_end 
                      ? format(new Date(subscriptionDetails.current_period_end * 1000), 'dd MMMM yyyy', { locale: ro })
                      : 'N/A'}
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-medium text-gray-900">{t('invoiceHistory')}</h3>
                {invoices.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {invoices.map((invoice) => (
                      <li key={invoice.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {format(new Date(invoice.created * 1000), 'dd MMM yyyy', { locale: ro })} - 
                          {(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                        </span>
                        <a 
                          href={invoice.invoice_pdf} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {t('downloadInvoice')}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">{t('noInvoices')}</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  onClick={handleBillingPortal}
                  disabled={billingLoading || !session?.user?.stripeCustomerId}
                  className="cursor-pointer px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {billingLoading ? t('common.loading') : t('manageBilling')}
                </button>
                
                <button
                  onClick={handleChangePlan}
                  className="cursor-pointer px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('changePlan')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}