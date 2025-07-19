'use client';

import { useState } from 'react';
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

interface Props {
  commande: Commande;
  onUpdate: (id: number, updateData: Record<string, string>) => void;
  onPrint?: (commande: Commande) => void;
  className?: string;
}

export default function CommandeCard({ commande, onUpdate, className }: Props) {
  const totalTTC = (item: LineItem) =>
    (parseFloat(item.total) + parseFloat(item.total_tax)).toFixed(2);

  const formattedDate = new Date(commande.date_created).toLocaleString('fr-FR');
  const [showWarning, setShowWarning] = useState(false);
  const { getPizzaChecked, togglePizzaChecked } = usePizzasCochees();

  const toutesCochees = commande.status !== 'preparation'
    ? true
    : commande.line_items.every((item) => {
        const name = `${item.quantity}× ${item.name}`;
        return getPizzaChecked(commande.id, name);
      });

  const borderLeftClass =
    commande.status === 'processing'
      ? 'border-l-2 border-orange-300'
      : commande.status === 'preparation'
      ? 'border-l-2 border-yellow-300'
      : commande.status === 'completed'
      ? 'border-l-2 border-green-300'
      : 'border-l-2 border-gray-200';

  const handleMarquerTerminee = () => {
    if (!toutesCochees) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    onUpdate(commande.id, { status: 'completed' });
  };

  const imprimerTicket = (commande: Commande) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const qrAvisGoogle = commande.status === 'completed'
      ? `
        <div class="qr">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://search.google.com/local/writereview?placeid=ChIJF2V4Q7iuxkcRfrMPwRnPG5I" alt="QR Google Avis" />
        </div>
        <div class="footer">📱 Laissez-nous un avis sur Google !</div>
      `
      : '';

    const contenu = `
      <html>
        <head>
          <title>Ticket commande #${commande.id}</title>
          <style>
            * { font-family: monospace; font-size: 12px; color: #000; }
            body { padding: 10px; width: 280px; }
            h2 { text-align: center; margin-bottom: 10px; }
            .separator { border-top: 1px dashed #000; margin: 8px 0; }
            .line { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .total { margin-top: 10px; font-weight: bold; font-size: 14px; text-align: right; }
            .footer { text-align: center; margin-top: 10px; font-size: 11px; }
            .qr { display: flex; justify-content: center; margin-top: 10px; }
            .qr img { width: 100px; height: 100px; }
          </style>
        </head>
        <body>
          <h2>ROCK'N PIZZA</h2>
          <div class="separator"></div>
          <div>Commande #${commande.id}</div>
          <div>${new Date(commande.date_created).toLocaleString('fr-FR')}</div>
          <div class="separator"></div>
          <div>Client: ${commande.billing.first_name} ${commande.billing.last_name}</div>
          <div>Tél: ${commande.billing.phone}</div>
          <div>Email: ${commande.billing.email}</div>
          <div class="separator"></div>
          ${commande.line_items.map(
            (item) => `
              <div class="line">
                <span>${item.quantity}× ${item.name}</span>
                <span>${(parseFloat(item.total) + parseFloat(item.total_tax)).toFixed(2)} €</span>
              </div>`
          ).join('')}
          <div class="separator"></div>
          <div class="total">Total TTC : ${commande.total} €</div>

          ${qrAvisGoogle}

          <div class="footer">Merci pour votre commande !</div>

          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(contenu);
    win.document.close();
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border ${borderLeftClass} w-full flex flex-col justify-between h-full transition-all duration-500 ease-in-out ${className}`}
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

        <div className="divide-y divide-gray-100 text-base text-gray-700 dark:text-gray-300">
          {commande.line_items.map((item, idx) => {
            const name = `${item.quantity}× ${item.name}`;
            const isChecked = getPizzaChecked(commande.id, name);

            return commande.status === 'preparation' ? (
              <label key={idx} className="py-2 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-green-600"
                  checked={isChecked}
                  onChange={() => togglePizzaChecked(commande.id, name)}
                />
                <div
                  className={`flex justify-between w-full transition ${
                    isChecked ? 'line-through text-gray-400 opacity-60' : ''
                  }`}
                >
                  <span>{name}</span>
                  <span className="font-semibold">{totalTTC(item)} €</span>
                </div>
              </label>
            ) : (
              <div key={idx} className="py-2 flex justify-between">
                <span>
                  <strong>{item.quantity}×</strong> {item.name}
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">
                  {totalTTC(item)} €
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 border-t pt-3 mt-3">
          <span className="font-bold text-lg text-gray-800 dark:text-white">
            Total : {commande.total} €
          </span>
        </div>

        {showWarning && (
          <p className="text-red-600 text-sm mt-2">
            ⚠️ Veuillez cocher toutes les pizzas avant de valider.
          </p>
        )}
      </div>

      <div className="mt-4 pt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {commande.status === 'processing' && (
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition w-full sm:w-auto"
            onClick={() => onUpdate(commande.id, { status: 'preparation' })}
          >
            🍕 Passer en préparation
          </button>
        )}
        {commande.status === 'preparation' && (
          <button
            disabled={!toutesCochees}
            className={`${
              toutesCochees
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-300 cursor-not-allowed'
            } text-white px-4 py-2 rounded-md text-sm font-medium transition w-full sm:w-auto`}
            onClick={handleMarquerTerminee}
          >
            ✅ Marquer comme terminée
          </button>
        )}
        {commande.status === 'completed' && (
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition w-full sm:w-auto"
            onClick={() => onUpdate(commande.id, { status: 'processing' })}
          >
            ↩️ Remettre en préparation
          </button>
        )}
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition w-full sm:w-auto"
          onClick={() => imprimerTicket(commande)}
        >
          🖨️ Imprimer
        </button>
      </div>
    </div>
  );
}
