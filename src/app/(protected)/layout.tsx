'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PizzasCocheesProvider } from '@/contexts/PizzasCocheesProvider'; // ajuste le chemin si besoin

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = document.cookie
      .split('; ')
      .find((row) => row.startsWith('authenticated='))
      ?.split('=')[1] === 'true';

    if (!isAuthenticated) {
      router.push('/');
    }
  }, [router]);

  // const handleLogout = () => {
  //   document.cookie = 'authenticated=; Max-Age=0; path=/';
  //   router.push('/');
  // };

  return (
    <PizzasCocheesProvider>
      <div className="relative min-h-screen">
        <div className="absolute top-4 right-4">
         <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition shadow-sm w-full sm:w-auto"
            onClick={async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
            }}>
           Se déconnecter
          </button>

        </div>
        {children}
      </div>
    </PizzasCocheesProvider>
  );
}
