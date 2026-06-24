import { NextResponse } from "next/server";

export function okResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function errorResponse(code: string, message: string, status: number = 400) {
  return NextResponse.json({ ok: false, code, message, error: message }, { status });
}
