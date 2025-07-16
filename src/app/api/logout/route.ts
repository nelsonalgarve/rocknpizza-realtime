import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Supprime le cookie en le remplaçant par un vide expiré
  response.headers.set(
    'Set-Cookie',
    'authenticated=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict'
  );

  return response;
}
