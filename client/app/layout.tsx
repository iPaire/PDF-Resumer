import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SmartPDF Notes',
  description: 'Rezumă PDF-uri, generează teste grilă și învață eficient cu AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <nav className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">SmartPDF Notes</h1>
          <div className="space-x-4">
            <a href="/" className="text-gray-700 hover:text-blue-600">Acasă</a>
            <a href="/pricing" className="text-gray-700 hover:text-blue-600">Prețuri</a>
            <a href="/login" className="text-gray-700 hover:text-blue-600">Autentificare</a>
          </div>
        </nav>

        <main className="min-h-screen pt-10 bg-gray-50">{children}</main>

        <footer className="mt-20 bg-white border-t py-6 text-center text-sm text-gray-600">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <a href="/despre" className="hover:text-blue-600">Despre noi</a>
              <a href="/termeni" className="hover:text-blue-600">Termeni și condiții</a>
              <a href="/confidentialitate" className="hover:text-blue-600">Politica de confidențialitate</a>
              <a href="/cookies" className="hover:text-blue-600">Politica de cookies</a>
              <a href="/contact" className="hover:text-blue-600">Contact</a>
            </div>
            <p>© {new Date().getFullYear()} SmartPDF Notes. Toate drepturile rezervate.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
