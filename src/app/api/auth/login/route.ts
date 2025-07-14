import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const user = process.env.LOGIN_USER;
  const pass = process.env.LOGIN_PASSWORD;

  if (username === user && password === pass) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
