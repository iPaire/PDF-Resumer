// app/components/Footer.tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('common');
  
  return (
    <footer className="mt-20 bg-white border-t py-6 text-center text-sm text-gray-600">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <Link href="/despre" className="hover:text-blue-600 transition">{t('aboutUs')}</Link>
          <Link href="/termeni" className="hover:text-blue-600 transition">{t('terms')}</Link>
          <Link href="/confidentialitate" className="hover:text-blue-600 transition">{t('privacy')}</Link>
          <Link href="/cookies" className="hover:text-blue-600 transition">{t('cookies')}</Link>
          <Link href="/contact" className="hover:text-blue-600 transition">{t('contact')}</Link>
        </div>
        <p>© {new Date().getFullYear()} SmartPDF Notes. {t('allRightsReserved')}</p>
      </div>
    </footer>
  );
}