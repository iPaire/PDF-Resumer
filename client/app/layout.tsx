import './globals.css';
import { Inter } from 'next/font/google';
import AuthProvider from './providers/SessionProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SmartPDF Notes',
  description: 'Rezumă PDF-uri, generează teste grilă și învață eficient cu AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className="h-full">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-full flex flex-col`}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen w-full">
            <Navbar />
            <main className="flex-grow pt-10 bg-gray-50 w-full max-w-full overflow-x-hidden">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}