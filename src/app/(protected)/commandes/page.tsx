// Suggestion : Tu pourrais envisager de déplacer la logique d'authentification (actuellement dans le layout)
// vers un middleware ou une redirection depuis la page racine '/' si non authentifié,
// afin d'afficher la page de login sur l'URL de base.

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import CommandeCard from '@/components/CommandeCard';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { usePizzasCochees } from '@/contexts/PizzasCocheesProvider';

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
  // const [loading, setLoading] = useState(true);
  const [filtreDate, setFiltreDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'));
  const [sonActif, setSonActif] = useState(false);
  const [nextNotifIn, setNextNotifIn] = useState(15);
  const [ongletActif, setOngletActif] = useState<'actives' | 'terminees' | 'pizzas'>('actives');

  const audioRef = useRef<HTMLAudioElement>(null);
  const sonIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const { getPizzaChecked, togglePizzaChecked } = usePizzasCochees();

  const playNotification = useCallback(async () => {
    const audio = audioRef.current;
    if (sonActif && audio) {
      try {
        audio.currentTime = 0;
        await audio.play();
      } catch (e) {
        console.warn('Erreur lecture audio :', e);
      }
    }
  }, [sonActif]);

  const stopNotification = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const startSoundLoop = useCallback(() => {
    if (sonIntervalRef.current) return;
    playNotification();
    setNextNotifIn(15);
    countdownRef.current = setInterval(() => {
      setNextNotifIn((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    sonIntervalRef.current = setInterval(() => {
      if (sonActif) playNotification();
    }, 15000);
  }, [playNotification, sonActif]);

  const stopSoundLoop = useCallback(() => {
    if (sonIntervalRef.current) clearInterval(sonIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    sonIntervalRef.current = null;
    countdownRef.current = null;
    stopNotification();
    setNextNotifIn(15);
  }, [stopNotification]);

  const activerSon = () => {
    setSonActif(true);
    localStorage.setItem('son-actif', 'true');
    const commandesEnCours = commandes.filter((cmd) => cmd.status === 'processing');
    if (commandesEnCours.length > 0) {
      startSoundLoop();
    }
  };

  const desactiverSon = () => {
    setSonActif(false);
    localStorage.setItem('son-actif', 'false');
    stopSoundLoop();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const son = localStorage.getItem('son-actif');
      setSonActif(son === 'true');
    }
  }, []);

  const fetchCommandes = useCallback(async () => {
    try {
      const res = await fetch('/api/commandes?status=processing,preparation');
      const data: Commande[] = await res.json();

      const cached = localStorage.getItem('commandes-cache');
      const currentStatus = data.map(({ id, status }) => ({ id, status }));
      const currentProcessing = data.filter((cmd) => cmd.status === 'processing');

      const previousProcessing = cached
        ? JSON.parse(cached).filter((c: CommandeCache) => c.status === 'processing')
        : [];

      const isNewOrder = currentProcessing.some(
        (cmd) => !previousProcessing.find((prev: CommandeCache) => prev.id === cmd.id)
      );

      const hasProcessing = currentProcessing.length > 0;

      if (isNewOrder) {
        await playNotification();
        toast.success('📦 Nouvelle commande reçue');
      }

      if (hasProcessing && sonActif) {
        startSoundLoop();
      } else {
        stopSoundLoop();
      }

      localStorage.setItem('commandes-cache', JSON.stringify(currentStatus));
      setCommandes(data);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    } finally {
      // setLoading(false);
    }
  }, [playNotification, sonActif, startSoundLoop, stopSoundLoop]);

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

      const updatedCommande = commandes.find((cmd) => cmd.id === id);
      const client = updatedCommande ? `${updatedCommande.billing.first_name} ${updatedCommande.billing.last_name}` : 'Client inconnu';
      const nouveauStatut = updateData.status;

      const statutLisible = nouveauStatut === 'processing' ? '🟠 Confirmée' : nouveauStatut === 'preparation' ? '🧑‍🍳 En préparation' : nouveauStatut === 'completed' ? '✅ Terminée' : nouveauStatut;

      toast.success(`✅ Statut mis à jour pour ${client} → ${statutLisible}`);
      await fetchCommandes();
      await fetchCommandesTerminees();
    } catch (err) {
      console.error('Erreur updateCommande:', err);
    }
  };

  const commandesParStatut = (statut: string, source: Commande[] = commandes) =>
    source.filter((cmd) => cmd.status === statut);

  useEffect(() => {
    fetchCommandes();
    fetchCommandesTerminees();
    const interval = setInterval(() => {
      fetchCommandes();
      fetchCommandesTerminees();
    }, 10000);
    return () => {
      clearInterval(interval);
      stopSoundLoop();
    };
  }, [fetchCommandes, stopSoundLoop]);

  const commandesTermineesFiltrees = commandesTerminees.filter((cmd) =>
    dayjs(cmd.date_created).format('YYYY-MM-DD') === filtreDate
  );

  return (
    <div className="p-4 space-y-12">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      <h1 className="text-2xl font-bold mb-4">📦 Commandes</h1>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <button
          className={`${
            ongletActif === 'actives' ? 'bg-orange-600' : 'bg-orange-500'
          } text-white px-4 py-2 rounded shadow`}
          onClick={() => setOngletActif('actives')}
        >
          Voir commandes actives
        </button>
        <button
          className={`${
            ongletActif === 'terminees' ? 'bg-gray-800' : 'bg-gray-700'
          } text-white px-4 py-2 rounded shadow`}
          onClick={() => setOngletActif('terminees')}
        >
          Voir terminées
        </button>
        <button
          className={`${
            ongletActif === 'pizzas' ? 'bg-yellow-600' : 'bg-yellow-500'
          } text-white px-4 py-2 rounded shadow`}
          onClick={() => setOngletActif('pizzas')}
        >
          Voir pizzas à préparer
        </button>
        <button
          className={`${sonActif ? 'bg-green-600' : 'bg-red-600'} text-white px-4 py-2 rounded shadow transition duration-200`}
          onClick={() => {
            if (sonActif) {
              desactiverSon();
            } else {
              activerSon();
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

      {ongletActif === 'actives' && (
        <>
          <section>
            <h2 className="text-xl font-semibold mb-2">🟠 Confirmées / Payées</h2>
            <div className="flex flex-wrap gap-4">
              {commandesParStatut('processing').map((cmd) => (
                <CommandeCard key={cmd.id} commande={cmd} onUpdate={updateCommande} />
              ))}
            </div>
          </section>

          <section className="border-t border-gray-300 pt-6 mt-6">
            <h2 className="text-xl font-semibold mb-2">🧑‍🍳 En préparation</h2>
            <div className="flex flex-wrap gap-4">
              {commandesParStatut('preparation').map((cmd) => (
                <CommandeCard key={cmd.id} commande={cmd} onUpdate={updateCommande} />
              ))}
            </div>
          </section>
        </>
      )}

      {ongletActif === 'terminees' && (
        <>
          <div className="mb-4">
            <label className="text-sm mr-2 font-medium text-gray-700">Filtrer par date :</label>
            <input
              type="date"
              value={filtreDate}
              onChange={(e) => setFiltreDate(e.target.value)}
              className="border px-3 py-1 rounded shadow-sm text-sm"
            />
          </div>
          <section>
            <h2 className="text-xl font-semibold mb-2">✅ Terminées ({filtreDate})</h2>
            <div className="flex flex-wrap gap-4">
              {commandesTermineesFiltrees.map((cmd) => (
                <CommandeCard key={cmd.id} commande={cmd} onUpdate={updateCommande} />
              ))}
            </div>
          </section>
        </>
      )}

      {ongletActif === 'pizzas' && (
        <section>
          <h2 className="text-xl font-semibold mb-4">🍕 Pizzas à préparer</h2>
          <ul className="space-y-4">
            {commandesParStatut('preparation')
              .flatMap((commande) =>
                commande.line_items.map((item, idx) => {
                  const name = `${item.quantity}× ${item.name}`;
                  const checked = getPizzaChecked(commande.id, name);
                  return {
                    key: `${commande.id}-${idx}`,
                    name,
                    commandeId: commande.id,
                    client: `${commande.billing.first_name} ${commande.billing.last_name}`,
                    checked,
                  };
                })
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((pizza) => (
                <li
                  key={pizza.key}
                  className="border p-3 rounded shadow bg-white flex items-start gap-2"
                >
                  <input
                    type="checkbox"
                    className="accent-green-600 mt-1"
                    checked={pizza.checked}
                    onChange={() => togglePizzaChecked(pizza.commandeId, pizza.name)}
                  />
                  <div>
                    <div className={pizza.checked ? 'line-through text-gray-400' : ''}>
                      {pizza.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      Commande #{pizza.commandeId} – {pizza.client}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
