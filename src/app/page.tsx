'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Si l'utilisateur est déjà connecté, rediriger vers /commandes
    const checkAuth = async () => {
      const res = await fetch('/api/check-auth');
      const data = await res.json();
      if (data.authenticated) {
        router.replace('/commandes');
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: motDePasse }),
    });

    if (res.ok) {
      // Attendre que le cookie soit bien reconnu
      setTimeout(() => {
        window.location.href = '/commandes';
      }, 100);
    } else {
      const data = await res.json();
      setErreur(data.message || 'Erreur lors de la connexion');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="Logo" width={80} height={80} />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Connexion Rock’n Pizza
        </h1>

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
