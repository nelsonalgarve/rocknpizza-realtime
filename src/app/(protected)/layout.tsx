'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('authenticated') !== 'true') {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4">
        <button
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow"
          onClick={() => {
            localStorage.removeItem('authenticated');
            router.push('/login');
          }}
        >
          Se déconnecter
        </button>
      </div>
      {children}
    </div>
  );
}
