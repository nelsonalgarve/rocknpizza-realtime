import { NextRequest, NextResponse } from 'next/server';
import type { NextApiRequest } from 'next';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;

  try {
    const updateData = await request.json();

    const wcBase = process.env.WOOCOMMERCE_URL!;
    const auth = {
      username: process.env.WOOCOMMERCE_CONSUMER_KEY!,
      password: process.env.WOOCOMMERCE_CONSUMER_SECRET!,
    };

    const res = await fetch(`${wcBase}/wp-json/wc/v3/orders/${id}`, {
      method: 'PUT',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Erreur mise à jour WooCommerce:', res.status, errorText);
      return NextResponse.json({ error: 'Erreur WooCommerce' }, { status: 500 });
    }

    const updatedOrder = await res.json();
    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error('Erreur serveur PATCH commande:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
