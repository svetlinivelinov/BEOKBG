import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, unauthorizedResponse } from '../../../../lib/emag-admin';
import { readStoredEmagSyncRuns } from '../../../../lib/emag-storage';

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? '50');
  const safeLimit = Number.isFinite(limit) ? Math.min(500, Math.max(1, Math.floor(limit))) : 50;
  const runs = await readStoredEmagSyncRuns(safeLimit);

  return NextResponse.json({
    success: true,
    data: {
      count: runs.length,
      runs
    }
  });
}
