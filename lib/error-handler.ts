import { NextResponse } from 'next/server';

const VERSION = 'v1';

export function errorResponse(message: string, error: unknown, status = 500): NextResponse {
  console.error(`[${VERSION}] ${message}:`, error);
  return NextResponse.json(
    {
      message,
      version: VERSION,
      error: error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? String((error as Record<string, unknown>).message)
          : String(error ?? 'Unknown error'),
    },
    { status }
  );
}

export function okResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
