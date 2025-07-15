'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import CommandeCard from '@/components/CommandeCard';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

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

type PizzaGroup = {
  total: number;
  commandes: { id: number; client: string }[];
};

function groupAndSortPizzas(commandes: Commande[]): Record<string, PizzaGroup> {
  const result: Record<string, PizzaGroup> = {};

  commandes.forEach((commande) => {
    const client = `${commande.billing.first_name} ${commande.billing.last_name}`;
    commande.line_items.forEach((item) => {
      if (!result[item.name]) {
        result[item.name] = { total: 0, commandes: [] };
      }
      result[item.name].total += item.quantity;
      result[item.name].commandes.push({ id: commande.id, client });
    });
  });

  return Object.keys(result)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = result[key];
      return acc;
    }, {} as Record<string, PizzaGroup>);
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [commandesTerminees, setCommandesTerminees] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [ongletActif, setOngletActif] = useState<'actives' | 'terminees' | 'pizzas'>('actives');
  const [filtreDate, setFiltreDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [sonActif, setSonActif] = useState(false);
  const [pizzasCochees, setPizzasCochees] = useState<string[]>([]);
  const [nextNotifIn, setNextNotifIn] = useState(15);

  const audioRef = useRef<HTMLAudioElement>(null);
  const sonIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSonActif(localStorage.getItem('son-actif') === 'true');
      const saved = localStorage.getItem('pizzas-cochees');
      if (saved) {
        try {
          setPizzasCochees(JSON.parse(saved));
        } catch {
          setPizzasCochees([]);
        }
      }
    }
  }, []);

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
    if (commandesEnCours.length > 0) startSoundLoop();
  };

  const desactiverSon = () => {
    setSonActif(false);
    localStorage.setItem('son-actif', 'false');
    stopSoundLoop();
  };

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

      if (hasProcessing && sonActif) startSoundLoop();
      else stopSoundLoop();

      localStorage.setItem('commandes-cache', JSON.stringify(currentStatus));
      setCommandes(data);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    } finally {
      setLoading(false);
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
      await fetch(`/api/commandes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      await fetchCommandes();
      await fetchCommandesTerminees();
    } catch (err) {
      console.error('Erreur updateCommande:', err);
    }
  };

  const commandesParStatut = (statut: string) =>
    commandes.filter((cmd) => cmd.status === statut);

  const commandesTermineesFiltrees = commandesTerminees.filter((cmd) =>
    dayjs(cmd.date_created).format('YYYY-MM-DD') === filtreDate
  );

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

  const togglePizza = (key: string) => {
    setPizzasCochees((prev) => {
      const updated = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      localStorage.setItem('pizzas-cochees', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="p-4 space-y-12">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />
      <h1 className="text-2xl font-bold mb-4">📦 Commandes</h1>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <button onClick={() => setOngletActif('actives')} className="bg-orange-500 text-white px-4 py-2 rounded">Commandes actives</button>
        <button onClick={() => setOngletActif('terminees')} className="bg-gray-700 text-white px-4 py-2 rounded">Commandes terminées</button>
        <button onClick={() => setOngletActif('pizzas')} className="bg-pink-600 text-white px-4 py-2 rounded">Pizzas à préparer</button>
        <button onClick={() => (sonActif ? desactiverSon() : activerSon())}
          className={`${sonActif ? 'bg-green-600' : 'bg-red-600'} text-white px-4 py-2 rounded`}
        >
          🔔 Notifications {sonActif ? 'activées' : 'désactivées'}
        </button>
        {sonActif && <span className="text-sm text-gray-700">Prochaine alerte dans {nextNotifIn}s</span>}
      </div>

      {/* Contenu par onglet */}
      {loading ? (
        <p>Chargement...</p>
      ) : ongletActif === 'terminees' ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">✅ Terminées</h2>
          <input type="date" value={filtreDate} onChange={(e) => setFiltreDate(e.target.value)} className="border px-2 py-1" />
          <div className="mt-4 flex flex-wrap gap-4">
            {commandesTermineesFiltrees.map((cmd) => (
              <CommandeCard key={cmd.id} commande={cmd} onUpdate={updateCommande} />
            ))}
          </div>
        </div>
      ) : ongletActif === 'pizzas' ? (
        <section>
          <h2 className="text-xl font-semibold mb-4">🍕 Pizzas à préparer</h2>
          <ul className="space-y-4">
            {Object.entries(groupAndSortPizzas(commandesParStatut('preparation'))).map(
              ([name, { total, commandes }]) => {
                const key = `${name}-${commandes.map((c) => c.id).join('-')}`;
                return (
                  <li key={key} className="border p-3 rounded shadow bg-white">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pizzasCochees.includes(key)}
                        onChange={() => togglePizza(key)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold">{total} × {name}</div>
                        <div className="text-xs text-gray-600">
                          {commandes.map((c) => `#${c.id} – ${c.client}`).join(', ')}
                        </div>
                      </div>
                    </label>
                  </li>
                );
              }
            )}
          </ul>
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-xl font-semibold mb-2">🟠 Confirmées</h2>
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
    </div>
  );
}
