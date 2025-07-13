import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    // Extraire l'ID de la commande depuis l'URL
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 1]; // récupère le [id]

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