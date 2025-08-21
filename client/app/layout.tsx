import './globals.css';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import AuthProvider from './providers/SessionProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { TrialProvider } from '@/context/TrialContext';
import TrialModal from '@/components/TrialModal';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import PageViewTracker from '@/components/PageViewTracker';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SmartPDF Notes',
  description: 'Transform documents into knowledge with AI-powered summaries, quizzes, and personalized learning materials.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full">
      <head>
        <GoogleAnalytics />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-full flex flex-col`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <TrialProvider>
              <PageViewTracker />
              <div className="flex flex-col min-h-screen w-full">
                <Navbar />
                <main className="flex-grow pt-10 bg-gray-50 w-full max-w-full overflow-x-hidden">
                  {children}
                </main>
                <Footer />
                <TrialModal />
              </div>
            </TrialProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}