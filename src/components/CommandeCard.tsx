'use client';

import { useState } from 'react';
import { Commande, LineItem } from '@/types';
import { usePizzasCochees } from '@/contexts/PizzasCocheesProvider';

interface Props {
  commande: Commande;
  onUpdate: (id: number, updateData: Record<string, string>) => void;
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

  const handleMarquerTerminee = () => {
    if (!toutesCochees) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    onUpdate(commande.id, { status: 'completed' });
  };

  const imprimerTicket = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const qrAvisGoogle = commande.status === 'completed'
      ? `
        <div class="qr">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://search.google.com/local/writereview?placeid=ChIJF2V4Q7iuxkcRfrMPwRnPG5I" alt="QR Google" />
        </div>
        <div class="footer">📱 Donnez votre avis Google !</div>
      `
      : '';

    const contenu = `
      <html>
        <head>
          <style>
            body { font-family: monospace; padding: 10px; width: 280px; }
            .separator { border-top: 1px dashed #000; margin: 8px 0; }
            .line { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .total { margin-top: 10px; font-weight: bold; text-align: right; }
            .footer { text-align: center; margin-top: 10px; font-size: 11px; }
            .qr { display: flex; justify-content: center; margin-top: 10px; }
            .qr img { width: 100px; height: 100px; }
          </style>
        </head>
        <body>
          <h2 style="text-align:center;">ROCK'N PIZZA</h2>
          <div class="separator"></div>
          <div>Commande #${commande.id}</div>
          <div>${formattedDate}</div>
          <div class="separator"></div>
          <div>Client: ${commande.billing.first_name} ${commande.billing.last_name}</div>
          <div>Tél: ${commande.billing.phone}</div>
          <div>Email: ${commande.billing.email}</div>
          <div class="separator"></div>
          ${commande.line_items.map(item => `
            <div class="line">
              <span>${item.quantity}× ${item.name}</span>
              <span>${totalTTC(item)} €</span>
            </div>`).join('')}
          <div class="separator"></div>
          <div class="total">Total TTC : ${commande.total} €</div>
          ${qrAvisGoogle}
          <div class="footer">Merci pour votre commande !</div>
          <script>
            window.onload = () => { window.print(); window.onafterprint = () => window.close(); };
          </script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(contenu);
    win.document.close();
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4 ${className}`}>
      <div className="flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              #{commande.id} – {commande.billing.first_name} {commande.billing.last_name}
            </h3>
            <p className="text-sm text-gray-500">{formattedDate}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">📧 {commande.billing.email}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">📞 {commande.billing.phone}</p>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            commande.status === 'processing' ? 'bg-orange-500 text-white' :
            commande.status === 'preparation' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {commande.status === 'processing' && '🟠 Nouvelle'}
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
        <div className={`flex justify-between w-full transition ${
          isChecked ? 'line-through text-gray-400 opacity-60' : ''
        }`}>
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


        <div className="text-right font-bold text-lg mt-4">
          Total : {commande.total} €
        </div>

        {showWarning && (
          <p className="text-red-600 text-sm mt-2">⚠️ Veuillez cocher toutes les pizzas avant de valider.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        {commande.status === 'processing' && (
          <button onClick={() => onUpdate(commande.id, { status: 'preparation' })}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded">
            🍕 Passer en préparation
          </button>
        )}
        {commande.status === 'preparation' && (
          <button
            disabled={!toutesCochees}
            onClick={handleMarquerTerminee}
            className={`px-4 py-1.5 rounded text-white ${
              toutesCochees ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            ✅ Marquer comme terminée
          </button>
        )}
        {commande.status === 'completed' && (
          <button onClick={() => onUpdate(commande.id, { status: 'processing' })}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded">
            ↩️ Remettre en préparation
          </button>
        )}
        <button
          onClick={imprimerTicket}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded"
        >
          🖨️ Imprimer
        </button>
      </div>
    </div>
  );
}
