// ✅ Composant complet CommandesPage.tsx avec filtre journalier pour les commandes terminées
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

export default function CommandesPage() {
  const router = useRouter();

useEffect(() => {
  if (localStorage.getItem('authenticated') !== 'true') {
    router.push('/login');
  }
}, [router]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [commandesTerminees, setCommandesTerminees] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [afficherTerminees, setAfficherTerminees] = useState(false);
  const [filtreDate, setFiltreDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'));
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
      stopSoundLoop();
    };
  }, [fetchCommandes, stopSoundLoop]);

  const commandesParStatut = (statut: string, source: Commande[] = commandes) =>
    source.filter((cmd) => cmd.status === statut);

  const commandesTermineesFiltrees = commandesTerminees.filter((cmd) =>
    dayjs(cmd.date_created).format('YYYY-MM-DD') === filtreDate
  );

  return (
    <div className="p-4">
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

      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      <h1 className="text-2xl font-bold mb-4">📦 Commandes</h1>

      {/* Boutons et filtres */}
<div className="flex flex-wrap gap-2 mb-6 items-center">
  <button
    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded shadow transition duration-200"
    onClick={() => setAfficherTerminees(false)}
  >
    Voir commandes actives
  </button>
  <button
    className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded shadow transition duration-200"
    onClick={() => setAfficherTerminees(true)}
  >
    Voir terminées
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

{afficherTerminees && (
  <div className="mb-4">
    <label className="text-sm mr-2 font-medium text-gray-700">Filtrer par date :</label>
    <input
      type="date"
      value={filtreDate}
      onChange={(e) => setFiltreDate(e.target.value)}
      className="border px-3 py-1 rounded shadow-sm text-sm"
    />
    <button
      className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded shadow"
      onClick={() => {
        const commandesDuJour = commandesTermineesFiltrees;

        import('jspdf').then(async ({ jsPDF }) => {
          const autoTable = (await import('jspdf-autotable')).default;
          const doc = new jsPDF();

          const logo = new Image();
          logo.src = '/logo.png';

          logo.onload = () => {
            doc.addImage(logo, 'PNG', 10, 10, 30, 30);
            doc.setFontSize(16);
            doc.text(`Commandes du ${filtreDate}`, 50, 20);

            const rows = commandesDuJour.map((cmd) => [
              cmd.id,
              `${cmd.billing.first_name} ${cmd.billing.last_name}`,
              dayjs(cmd.date_created).format('HH:mm'),
              `${cmd.total} €`,
              cmd.line_items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
            ]);

            autoTable(doc, {
              startY: 50,
              head: [['ID', 'Client', 'Heure', 'Total', 'Produits']],
              body: rows,
              styles: { fontSize: 10, cellPadding: 3 },
              headStyles: { fillColor: [60, 60, 60] },
            });

            doc.save(`commandes_${filtreDate}.pdf`);
          };
        });
      }}
    >
      📄 Export PDF du jour
    </button>
  </div>
)}

{loading ? (
  <p>Chargement...</p>
) : afficherTerminees ? (
  <div>
    <h2 className="text-xl font-semibold mb-2">✅ Terminées ({filtreDate})</h2>
    <div className="flex flex-wrap gap-4">
      {commandesTermineesFiltrees.map((cmd) => (
        <CommandeCard
          key={cmd.id}
          commande={cmd}
          onUpdate={updateCommande}
          onPrint={imprimerCommande}
          className="animate-fade-in transition-transform duration-500"
        />
      ))}
      {commandesTermineesFiltrees.length === 0 && (
        <p className="text-gray-500 italic">Aucune commande terminée pour cette date.</p>
      )}
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
            className="animate-fade-in transition-transform duration-500"
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
            className="animate-fade-in transition-transform duration-500"
          />
        ))}
      </div>
    </div>
  </>
)}
    </div>
  );
}
