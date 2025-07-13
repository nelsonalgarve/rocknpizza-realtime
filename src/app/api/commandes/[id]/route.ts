import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;

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
        Authorization: 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur WooCommerce' }, { status: 500 });
    }

    const updatedOrder = await res.json();
    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error('Erreur PATCH commande:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
