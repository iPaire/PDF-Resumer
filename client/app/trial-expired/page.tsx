import Link from 'next/link';

export default function TrialExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <div className="mx-auto flex items-center justify-center">
            <div className="bg-red-100 rounded-full p-3">
              <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Perioada ta de trial a expirat
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Perioada ta gratuită de 7 zile a expirat. Pentru a continua să folosești toate funcționalitățile, te rugăm să alegi un plan de abonament.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <Link href="/pricing">
              <button
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Vezi planurile de abonament
              </button>
            </Link>
          </div>
          
          <div className="text-center">
            <Link href="/">
              <a className="text-sm text-blue-600 hover:text-blue-500">
                Sau continuă cu planul gratuit
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}