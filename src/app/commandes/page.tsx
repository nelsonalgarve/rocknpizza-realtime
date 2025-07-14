'use client';

import { useEffect, useState, useRef } from 'react';
import CommandeCard from '@/components/CommandeCard';
import toast from 'react-hot-toast';

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
  const [sonActif, setSonActif] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('son-actif') === 'true';
    }
    return false;
  });
  const [nextNotifIn, setNextNotifIn] = useState(15);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sonIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const activerSon = () => {
    setSonActif(true);
    localStorage.setItem('son-actif', 'true');
  };

  const desactiverSon = () => {
    setSonActif(false);
    localStorage.setItem('son-actif', 'false');
  };

  const playNotification = async () => {
    const audio = audioRef.current;
    if (sonActif && audio) {
      try {
        audio.currentTime = 0;
        await audio.play();
      } catch (e) {
        console.warn('Erreur lecture audio :', e);
      }
    }
  };

  const stopNotification = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
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
        if (sonIntervalRef.current) clearInterval(sonIntervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        setNextNotifIn(15);
      } else if (shouldPlay || sonActif) {
        if (shouldPlay && !sonActif) {
          toast('📦 Nouvelle commande reçue ! Activez les sons si vous souhaitez être notifié.');
        } else {
          await playNotification();
        }

        if (sonIntervalRef.current) clearInterval(sonIntervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        setNextNotifIn(15);
        countdownRef.current = setInterval(() => {
          setNextNotifIn((prev) => (prev <= 1 ? 15 : prev - 1));
        }, 1000);

        sonIntervalRef.current = setInterval(() => {
          if (sonActif && currentProcessing.length > 0) {
            playNotification();
          }
        }, 15000);
      }

      // 🔁 Première visite : son actif + commandes => déclenche tout
      if (!cached && sonActif && currentProcessing.length > 0) {
        await playNotification();
        setNextNotifIn(15);
        countdownRef.current = setInterval(() => {
          setNextNotifIn((prev) => (prev <= 1 ? 15 : prev - 1));
        }, 1000);
        sonIntervalRef.current = setInterval(() => {
          if (sonActif && currentProcessing.length > 0) {
            playNotification();
          }
        }, 15000);
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
    return () => {
      clearInterval(interval);
      if (sonIntervalRef.current) clearInterval(sonIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const commandesParStatut = (statut: string, source: Commande[] = commandes) =>
    source.filter((cmd) => cmd.status === statut);

  return (
    <div className="p-4">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      {!sonActif && (
        <div className="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded animate-fade-in">
          <p className="mb-2 font-semibold">🔊 Notifications sonores désactivées</p>
          <button
            onClick={async () => {
              const audio = audioRef.current;
              if (audio) {
                try {
                  await audio.play();
                  audio.pause();
                  audio.currentTime = 0;
                  activerSon();
                  toast.success('Notifications sonores activées ✅');
                } catch (e) {
                  toast.error('Le navigateur bloque encore l’audio.');
                  console.error('Erreur autorisation audio:', e);
                }
              }
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow"
          >
            Autoriser les sons maintenant
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">📦 Commandes</h1>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
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
          onClick={async () => {
            const audio = audioRef.current;
            if (!sonActif && audio) {
              try {
                await audio.play();
                audio.pause();
                audio.currentTime = 0;
                activerSon();
                toast.success('Notifications sonores activées ✅');
              } catch {
                toast.error("Le navigateur bloque l'audio. Cliquez pour autoriser.");
              }
            } else {
              desactiverSon();
            }
          }}
        >
          🔔 Notifications {sonActif ? 'activées' : 'désactivées'}
        </button>
        {sonActif && (
          <span className="text-sm text-gray-700">
            Prochaine alerte dans {nextNotifIn}s
          </span>
        )}
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="space-y-10 animate-fade-in">
          {!afficherTerminees && (
            <>
              {/* Confirmées */}
              <section className="bg-white rounded-xl shadow p-5 border border-orange-300">
                <h2 className="text-xl font-bold text-orange-600 mb-4">
                  🟠 Confirmées / Payées
                </h2>
                {commandesParStatut('processing').length === 0 ? (
                  <p className="text-gray-500 italic">Aucune commande confirmée.</p>
                ) : (
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
                )}
              </section>

              {/* Préparation */}
              <section className="bg-white rounded-xl shadow p-5 border border-blue-300">
                <h2 className="text-xl font-bold text-blue-600 mb-4">
                  🧑‍🍳 En préparation
                </h2>
                {commandesParStatut('preparation').length === 0 ? (
                  <p className="text-gray-500 italic">Aucune commande en préparation.</p>
                ) : (
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
                )}
              </section>
            </>
          )}

          {afficherTerminees && (
            <section className="bg-white rounded-xl shadow p-5 border border-gray-400">
              <h2 className="text-xl font-bold text-gray-800 mb-4">✅ Terminées</h2>
              {commandesTerminees.length === 0 ? (
                <p className="text-gray-500 italic">Aucune commande terminée.</p>
              ) : (
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
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
