'use client';

import { Commande } from '@/types';
import { usePizzasCochees } from '@/contexts/PizzasCocheesProvider';

interface Props {
  commandes: Commande[] | undefined;
}

export default function PizzasAPreparer({ commandes }: Props) {
  const { getPizzaChecked, togglePizzaChecked } = usePizzasCochees();

  if (!Array.isArray(commandes)) {
    console.warn('❌ commandes n’est pas un tableau :', commandes);
    return null;
  }

  const pizzas = commandes
    .filter((cmd) => cmd.status === 'preparation')
    .flatMap((cmd) =>
      cmd.line_items.map((item, idx) => {
        const name = `${item.quantity}× ${item.name}`;
        return {
          key: `${cmd.id}-${idx}`,
          name,
          commandeId: cmd.id,
          client: `${cmd.billing.first_name} ${cmd.billing.last_name}`,
          date: new Date(cmd.date_created).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          checked: getPizzaChecked(cmd.id, name),
        };
      })
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">🍕 Pizzas à préparer</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {pizzas.map((pizza) => {
  const borderClass = pizza.checked
    ? 'border-gray-300'
    : 'border-yellow-300';

  return (
    <button
      key={pizza.key}
      onClick={() => togglePizzaChecked(pizza.commandeId, pizza.name)}
      className={`text-left w-full h-full bg-white dark:bg-gray-900 border ${borderClass} rounded-xl shadow-sm p-4 transition-all duration-200 ${
        pizza.checked ? 'opacity-50 line-through' : 'hover:bg-yellow-50'
      }`}
    >
      <div className="text-lg font-semibold text-gray-800 dark:text-white">
        {pizza.name}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        🕒 {pizza.date} – #{pizza.commandeId} – {pizza.client}
      </div>
    </button>
  );
})}

      </div>
    </section>
  );
}
