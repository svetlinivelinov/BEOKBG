import { NextResponse } from 'next/server';
import { listSamedayLockers } from '../../../../lib/payments/samedayClient';

export async function GET() {
  try {
    const lockers = await listSamedayLockers();
    return NextResponse.json({ ok: true, lockers });
  } catch (error) {
    console.error('[sameday_lockers_failed]', error);
    return NextResponse.json({ ok: false, error: 'sameday_lockers_failed' }, { status: 502 });
  }
}
