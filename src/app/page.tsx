'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuthenticated = document.cookie
        .split('; ')
        .find((row) => row.startsWith('authenticated='))
        ?.split('=')[1] === 'true';

      if (isAuthenticated) {
        router.push('/commandes');
      }
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (motDePasse === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      document.cookie = 'authenticated=true; path=/';
      router.push('/commandes');
    } else {
      setErreur('Mot de passe incorrect');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.png" alt="Logo" width={80} height={80} className="mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Connexion Rock n Pizza</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
