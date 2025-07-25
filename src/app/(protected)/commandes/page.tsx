// Fichier : app/(protected)/commandes/page.tsx

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import CommandeCard from '@/components/CommandeCard';
import PizzasAPreparer from '@/components/PizzasAPreparer';
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
  const [filtreDate, setFiltreDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'));
  const [sonActif, setSonActif] = useState(false);
  const [nextNotifIn, setNextNotifIn] = useState(15);
  const [ongletActif, setOngletActif] = useState<'actives' | 'preparation' | 'terminees' | 'pizzas'>('actives');

  const audioRef = useRef<HTMLAudioElement>(null);
  const sonIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const { getPizzaChecked } = usePizzasCochees();

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

      toast.success('✅ Statut mis à jour');
      await fetchCommandes();
      await fetchCommandesTerminees();
    } catch (err) {
      console.error('Erreur updateCommande:', err);
    }
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
      stopSoundLoop();
    };
  }, [fetchCommandes, stopSoundLoop]);

  const commandesParStatut = (statut: string) => commandes.filter((cmd) => cmd.status === statut);
  const commandesTermineesFiltrees = commandesTerminees.filter((cmd) => dayjs(cmd.date_created).format('YYYY-MM-DD') === filtreDate);

  const pizzasAPreparer = commandesParStatut('preparation').flatMap((cmd) =>
    cmd.line_items.map((item) => {
      const name = `${item.quantity}× ${item.name}`;
      return getPizzaChecked(cmd.id, name) ? 0 : item.quantity;
    })
  );

  const totalPizzasAPreparer = pizzasAPreparer.reduce((acc, qty) => acc + qty, 0);

  return (
    <div className="p-4 space-y-12">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      <h1 className="text-2xl font-bold mb-4">📦 Commandes</h1>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-6">
        <button onClick={() => setOngletActif('actives')} className={`px-3 py-1.5 rounded-md text-sm font-medium border shadow-sm transition w-full sm:w-auto ${ongletActif === 'actives' ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}>
          🟠 Confirmées ({commandesParStatut('processing').length})
        </button>
        <button onClick={() => setOngletActif('preparation')} className={`px-3 py-1.5 rounded-md text-sm font-medium border shadow-sm transition w-full sm:w-auto ${ongletActif === 'preparation' ? 'bg-yellow-600 text-white border-yellow-700' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}>
          🧑‍🍳 En préparation ({commandesParStatut('preparation').length})
        </button>
        <button onClick={() => setOngletActif('pizzas')} className={`px-3 py-1.5 rounded-md text-sm font-medium border shadow-sm transition w-full sm:w-auto ${ongletActif === 'pizzas' ? 'bg-pink-600 text-white border-pink-700' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}>
          🍕 Pizzas à préparer ({totalPizzasAPreparer})
        </button>
        <button onClick={() => setOngletActif('terminees')} className={`px-3 py-1.5 rounded-md text-sm font-medium border shadow-sm transition w-full sm:w-auto ${ongletActif === 'terminees' ? 'bg-green-800 text-white border-green-700' : 'bg-white text-gray-800 hover:bg-green-100 border-gray-300'}`}>
          ✅ Terminées ({commandesTermineesFiltrees.length})
        </button>
        <button className={`px-3 py-1.5 rounded-md text-sm font-medium border shadow-sm transition w-full sm:w-auto ${sonActif ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700'}`} onClick={sonActif ? desactiverSon : activerSon}>
          🔔 Notifications {sonActif ? 'activées' : 'désactivées'}
        </button>
        {sonActif && <span className="text-sm text-gray-600 self-center">Prochaine alerte dans {nextNotifIn}s</span>}
      </div>

      {ongletActif === 'actives' && (
        <section>
          <h2 className="text-xl font-semibold mb-2">🟠 Confirmées / Payées</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commandesParStatut('processing').map((cmd) => (
              <CommandeCard key={cmd.id} commande={cmd} onUpdate={updateCommande} />
            ))}
          </div>
        </section>
      )}

      {ongletActif === 'preparation' && (
        <section>
          <h2 className="text-xl font-semibold mb-2">🧑‍🍳 Commandes en préparation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commandesParStatut('preparation').map((cmd) => (
              <CommandeCard key={cmd.id} commande={cmd} onUpdate={updateCommande} />
            ))}
          </div>
        </section>
      )}

      {ongletActif === 'terminees' && (
        <section>
          <div className="mb-4">
            <label className="text-sm mr-2 font-medium text-gray-700">Filtrer par date :</label>
            <input
              type="date"
              value={filtreDate}
              onChange={(e) => setFiltreDate(e.target.value)}
              className="border px-3 py-1 rounded shadow-sm text-sm"
            />
          </div>
          <h2 className="text-xl font-semibold mb-2">✅ Terminées ({filtreDate})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commandesTermineesFiltrees.map((cmd) => (
              <CommandeCard key={cmd.id} commande={cmd} onUpdate={updateCommande} />
            ))}
          </div>
        </section>
      )}

      {ongletActif === 'pizzas' && (
        <PizzasAPreparer commandes={commandesParStatut('preparation')} />
      )}
    </div>
  );
}
