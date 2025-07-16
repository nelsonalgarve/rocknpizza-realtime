import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const password = body.password;
  const expected = process.env.ADMIN_PASSWORD;

  if (password === expected) {
    const response = NextResponse.json({ success: true });
    response.headers.set(
      'Set-Cookie',
      `authenticated=true; Path=/; HttpOnly; SameSite=Strict`
    );
    return response;
  }

  return NextResponse.json(
    { success: false, message: 'Mot de passe incorrect' },
    { status: 401 }
  );
}
