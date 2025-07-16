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
  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow"
  onClick={async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  }}
>
  Se déconnecter
</button>

        </div>
        {children}
      </div>
    </PizzasCocheesProvider>
  );
}
