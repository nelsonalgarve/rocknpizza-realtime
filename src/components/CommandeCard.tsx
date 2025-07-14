'use client';

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

interface Props {
  commande: Commande;
  onUpdate: (id: number, updateData: Record<string, string>) => void;
  onPrint: (commande: Commande) => void;
  className?: string;
}

export default function CommandeCard({ commande, onUpdate, onPrint, className }: Props) {
  const totalTTC = (item: LineItem) =>
    (parseFloat(item.total) + parseFloat(item.total_tax)).toFixed(2);

  const formattedDate = new Date(commande.date_created).toLocaleString('fr-FR');

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-600 w-full sm:w-[48%] lg:w-[32%] flex flex-col justify-between h-full transition-all duration-500 ease-in-out ${className}`}
    >
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
              #{commande.id} – {commande.billing.first_name} {commande.billing.last_name}
            </h3>
            <p className="text-sm text-gray-500">{formattedDate}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">📧 {commande.billing.email}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">📞 {commande.billing.phone}</p>
          </div>
          <span
            className={`text-sm font-bold px-4 py-1.5 rounded-full shadow-md border transition-colors duration-300 ${
              commande.status === 'processing'
                ? 'bg-orange-500 text-white border-orange-600 animate-pulse'
                : commande.status === 'preparation'
                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                : commande.status === 'completed'
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-gray-100 text-gray-800 border-gray-300'
            }`}
          >
            {commande.status === 'processing' && '🟠  Nouvelle'}
            {commande.status === 'preparation' && '🧑‍🍳 En préparation'}
            {commande.status === 'completed' && '✅ Terminée'}
          </span>
        </div>

        <div className="divide-y divide-gray-200 text-base text-gray-700 dark:text-gray-300">
          {commande.line_items.map((item, idx) => (
            <div key={idx} className="py-2 flex justify-between">
              <span>
                <strong>{item.quantity}×</strong> {item.name}
              </span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {totalTTC(item)} €
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 border-t pt-3 mt-3">
          <span className="font-bold text-lg text-gray-800 dark:text-white">
            Total : {commande.total} €
          </span>
        </div>
      </div>

      <div className="mt-4 pt-2 flex flex-wrap gap-2 justify-end">
        {commande.status === 'processing' && (
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg shadow-md transition transform active:scale-95"
            onClick={() => onUpdate(commande.id, { status: 'preparation' })}
          >
            🍕 Passer en préparation
          </button>
        )}
        {commande.status === 'preparation' && (
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg shadow-md transition transform active:scale-95"
            onClick={() => onUpdate(commande.id, { status: 'completed' })}
          >
            ✅ Marquer comme terminée
          </button>
        )}
        {commande.status === 'completed' && (
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg shadow-md transition transform active:scale-95"
            onClick={() => onUpdate(commande.id, { status: 'processing' })}
          >
            ↩️ Remettre en préparation
          </button>
        )}
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg shadow-md transition transform active:scale-95"
          onClick={() => onPrint(commande)}
        >
          🖨️ Imprimer
        </button>
      </div>
    </div>
  );
}
