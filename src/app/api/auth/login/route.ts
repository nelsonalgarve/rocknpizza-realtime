// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const { username, password } = body

  if (
    username === process.env.LOGIN_USER &&
    password === process.env.LOGIN_PASSWORD
  ) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false }, { status: 401 })
}
