import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const wcBase = process.env.WOOCOMMERCE_URL!;
    const username = process.env.WOOCOMMERCE_CONSUMER_KEY!;
    const password = process.env.WOOCOMMERCE_CONSUMER_SECRET!;
    const perPage = 20;

    const { searchParams } = new URL(request.url);
    const statuses = searchParams.getAll('status');
    const statusQuery = statuses.length > 0
      ? statuses.map((s) => `status=${encodeURIComponent(s)}`).join('&')
      : 'status=processing&status=preparation';

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    const response = await fetch(
      `${wcBase}/wp-json/wc/v3/orders?${statusQuery}&per_page=${perPage}`,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Erreur API WooCommerce:', response.status, error);
      return NextResponse.json({ error: 'Erreur API WooCommerce' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur serveur :', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
