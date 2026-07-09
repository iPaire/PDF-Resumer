import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import AuthProvider from './providers/SessionProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { TrialProvider } from '@/context/TrialContext';
import TrialModal from '@/components/TrialModal';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import PageViewTracker from '@/components/PageViewTracker';
import CookieBanner from '@/components/CookieBanner';
import { SITE_URL } from '@/lib/site';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'SmartPDF Notes',
  description: 'Transform documents into knowledge with AI-powered summaries, quizzes, and personalized learning materials.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans bg-canvas text-ink min-h-full flex flex-col`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <TrialProvider>
              <GoogleAnalytics />
              <PageViewTracker />
              <div className="flex flex-col min-h-screen w-full">
                <Navbar />
                <main className="flex-grow pt-10 bg-canvas w-full max-w-full overflow-x-hidden">
                  {children}
                </main>
                <Footer />
                <TrialModal />
              </div>
              <CookieBanner />
            </TrialProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}