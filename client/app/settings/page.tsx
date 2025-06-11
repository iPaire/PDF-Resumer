// app/settings/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { updateProfile, changePassword } from '@/lib/actions';

export default function SettingsPage() {
  const { data: session, update } = useSession();
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
        setProfileSuccess('Profil actualizat cu succes!');
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
      setPasswordError('Parolele nu se potrivesc');
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
        setPasswordSuccess('Parolă schimbată cu succes!');
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Setări cont</h1>
          <p className="mt-2 text-gray-600">
            Gestionează informațiile contului tău și setările de securitate
          </p>
        </div>

        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {/* Profile Section */}
          <div className="px-6 py-5">
            <h2 className="text-xl font-semibold text-gray-900">Profil</h2>
            <p className="mt-1 text-sm text-gray-500">
              Actualizează informațiile personale
            </p>
            
            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nume
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
                  Adresă email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleProfileChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
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
                  {isLoading ? 'Se salvează...' : 'Salvează modificări'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Password Section */}
          <div className="px-6 py-5">
            <h2 className="text-xl font-semibold text-gray-900">Schimbă parola</h2>
            <p className="mt-1 text-sm text-gray-500">
              Pentru securitate, folosește o parolă lungă și unică
            </p>
            
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Parola actuală
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
                  Parolă nouă
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
                  Confirmă parola nouă
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
                  {isLoading ? 'Se actualizează...' : 'Schimbă parola'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}