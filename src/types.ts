export interface Commande {
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
  line_items: {
    name: string;
    quantity: number;
    total: string;
    total_tax: string;
  }[];
}

export interface LineItem {
  name: string;
  quantity: number;
  total: string;
  total_tax: string;
}