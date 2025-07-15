// src/contexts/PizzasCocheesProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Structure : { [commandeId]: { [pizzaName]: true | false } }
type PizzaState = Record<number, Record<string, boolean>>;

interface ContextType {
  pizzas: PizzaState;
  getPizzaChecked: (commandeId: number, name: string) => boolean;
  togglePizzaChecked: (commandeId: number, name: string) => void;
}

const PizzasCocheesContext = createContext<ContextType | undefined>(undefined);

export function PizzasCocheesProvider({ children }: { children: ReactNode }) {
  const [pizzas, setPizzas] = useState<PizzaState>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pizzas-cochees-global');
      if (saved) {
        try {
          setPizzas(JSON.parse(saved));
        } catch {
          setPizzas({});
        }
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pizzas-cochees-global', JSON.stringify(pizzas));
  }, [pizzas]);

  const getPizzaChecked = (commandeId: number, name: string) => {
    return pizzas[commandeId]?.[name] || false;
  };

  const togglePizzaChecked = (commandeId: number, name: string) => {
    setPizzas((prev) => {
      const current = prev[commandeId]?.[name] || false;
      return {
        ...prev,
        [commandeId]: {
          ...prev[commandeId],
          [name]: !current,
        },
      };
    });
  };

  return (
    <PizzasCocheesContext.Provider value={{ pizzas, getPizzaChecked, togglePizzaChecked }}>
      {children}
    </PizzasCocheesContext.Provider>
  );
}

export function usePizzasCochees() {
  const context = useContext(PizzasCocheesContext);
  if (!context) {
    throw new Error('usePizzasCochees doit être utilisé dans un PizzasCocheesProvider');
  }
  return context;
}
