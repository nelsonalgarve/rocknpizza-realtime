'use client';

import { useEffect, useState, useRef } from 'react';
import CommandeCard from '@/components/CommandeCard';

interface LineItem {
  name: string;
  quantity: number;
  total: string;
  total_tax: string;
}

interface Commande {
  id: number;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  total: string;
  date_created: string;
  status: string;
  line_items: LineItem[];
}

type CommandeCache = { id: number; status: string };

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [commandesTerminees, setCommandesTerminees] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [afficherTerminees, setAfficherTerminees] = useState(false);
  const [sonActif, setSonActif] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotification = () => {
    if (sonActif && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const stopNotification = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const fetchCommandes = async () => {
    try {
      const res = await fetch('/api/commandes?status=processing,preparation');
      const data: Commande[] = await res.json();

      const cached = localStorage.getItem('commandes-cache');
      const currentStatus = data.map(({ id, status }) => ({ id, status }));
      const currentProcessing = data.filter((cmd) => cmd.status === 'processing');

      let shouldPlay = false;

      if (cached) {
        const previous: CommandeCache[] = JSON.parse(cached);
        const previousProcessing = previous.filter((c) => c.status === 'processing');
        shouldPlay = currentProcessing.some(
          (c) => !previousProcessing.find((p) => p.id === c.id)
        );
      } else {
        shouldPlay = currentProcessing.length > 0;
      }

      if (currentProcessing.length === 0) {
        stopNotification();
      } else if (shouldPlay) {
        playNotification();
      }

      localStorage.setItem('commandes-cache', JSON.stringify(currentStatus));
      setCommandes(data);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommandesTerminees = async () => {
    try {
      const res = await fetch('/api/commandes?status=completed');
      const data: Commande[] = await res.json();
      setCommandesTerminees(data.filter((cmd) => cmd.status === 'completed'));
    } catch (error) {
      console.error('Erreur chargement commandes terminées:', error);
    }
  };

  const updateCommande = async (id: number, updateData: Record<string, string>) => {
    try {
      const res = await fetch(`/api/commandes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        console.error('Échec de la mise à jour:', await res.text());
        return;
      }

      await fetchCommandes();
      await fetchCommandesTerminees();
    } catch (err) {
      console.error('Erreur updateCommande:', err);
    }
  };

  const imprimerCommande = (commande: Commande) => {
    const win = window.open('', '_blank');
    win?.document.write(`<pre>${JSON.stringify(commande, null, 2)}</pre>`);
    win?.print();
    win?.close();
  };

  useEffect(() => {
    fetchCommandes();
    fetchCommandesTerminees();
    const interval = setInterval(() => {
      fetchCommandes();
      fetchCommandesTerminees();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const commandesParStatut = (statut: string, source: Commande[] = commandes) =>
    source.filter((cmd) => cmd.status === statut);

  return (
    <div className="p-4">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      <h1 className="text-2xl font-bold mb-4">📦 Commandes</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded shadow"
          onClick={() => setAfficherTerminees(false)}
        >
          Voir commandes actives
        </button>
        <button
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded shadow"
          onClick={() => setAfficherTerminees(true)}
        >
          Voir terminées
        </button>
        <button
          className={`${
            sonActif ? 'bg-green-600' : 'bg-red-600'
          } hover:opacity-80 text-white px-4 py-2 rounded shadow`}
          onClick={() => setSonActif(!sonActif)}
        >
          Notifications sonores {sonActif ? 'activées' : 'désactivées'}
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : afficherTerminees ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">✅ Terminées</h2>
          <div className="flex flex-wrap gap-4">
            {commandesTerminees.map((cmd) => (
              <CommandeCard
                key={cmd.id}
                commande={cmd}
                onUpdate={updateCommande}
                onPrint={imprimerCommande}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">🟠 Confirmées / Payées</h2>
            <div className="flex flex-wrap gap-4">
              {commandesParStatut('processing').map((cmd) => (
                <CommandeCard
                  key={cmd.id}
                  commande={cmd}
                  onUpdate={updateCommande}
                  onPrint={imprimerCommande}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">🧑‍🍳 En préparation</h2>
            <div className="flex flex-wrap gap-4">
              {commandesParStatut('preparation').map((cmd) => (
                <CommandeCard
                  key={cmd.id}
                  commande={cmd}
                  onUpdate={updateCommande}
                  onPrint={imprimerCommande}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
