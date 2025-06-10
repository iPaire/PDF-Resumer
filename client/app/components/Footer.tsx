// app/components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-20 bg-white border-t py-6 text-center text-sm text-gray-600">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <Link href="/despre" className="hover:text-blue-600 transition">Despre noi</Link>
          <Link href="/termeni" className="hover:text-blue-600 transition">Termeni și condiții</Link>
          <Link href="/confidentialitate" className="hover:text-blue-600 transition">Politica de confidențialitate</Link>
          <Link href="/cookies" className="hover:text-blue-600 transition">Politica de cookies</Link>
          <Link href="/contact" className="hover:text-blue-600 transition">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} SmartPDF Notes. Toate drepturile rezervate.</p>
      </div>
    </footer>
  );
}