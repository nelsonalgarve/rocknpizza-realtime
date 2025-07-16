import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    'Set-Cookie',
    'authenticated=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  return response;
}
