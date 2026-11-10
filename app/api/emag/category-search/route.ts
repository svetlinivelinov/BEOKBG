import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';

const ITEMS_PER_PAGE = 100;
const DEFAULT_MAX_PAGES = 40;
const HARD_MAX_PAGES = 100;

type CategoryMatch = {
  id: number;
  name: string;
  isAllowed: boolean | number | null;
  parentId: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toNumberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value.trim()) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function toCategory(entry: unknown): CategoryMatch | null {
  const source = asRecord(entry);
  const id = toNumberOrNull(source?.id);
  if (!source || id === null || typeof source.name !== 'string') {
    return null;
  }

  const allowed = source.is_allowed;

  return {
    id: Math.floor(id),
    name: source.name,
    isAllowed: typeof allowed === 'boolean' || typeof allowed === 'number' ? allowed : null,
    parentId: toNumberOrNull(source.parent_id)
  };
}

async function readCategoryPage(
  page: number,
  useDataWrapper: boolean
): Promise<{ items: unknown[]; messages: string[] }> {
  const client = getEmagClient();
  const filters = { currentPage: page, itemsPerPage: ITEMS_PER_PAGE };
  const raw = asRecord(
    await client.post<unknown>('/category/read?language=BG', useDataWrapper ? { data: filters } : filters)
  );
  const results = raw?.results;
  const messages = Array.isArray(raw?.messages)
    ? raw.messages.filter((item): item is string => typeof item === 'string')
    : [];

  return { items: Array.isArray(results) ? results : [], messages };
}

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const keywords = (url.searchParams.get('q') ?? 'термостат,thermostat')
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
  const requestedPages = Number(url.searchParams.get('maxPages') ?? DEFAULT_MAX_PAGES);
  const maxPages = Number.isFinite(requestedPages)
    ? Math.min(HARD_MAX_PAGES, Math.max(1, Math.floor(requestedPages)))
    : DEFAULT_MAX_PAGES;

  if (keywords.length === 0) {
    return NextResponse.json({ success: false, error: 'missing_query' }, { status: 400 });
  }

  try {
    const matches: CategoryMatch[] = [];
    let scanned = 0;
    let pagesRead = 0;
    let useDataWrapper = false;
    let lastMessages: string[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
      let { items, messages } = await readCategoryPage(page, useDataWrapper);

      // Some accounts only accept the documented `data` wrapper for reads.
      if (page === 1 && items.length === 0 && !useDataWrapper) {
        useDataWrapper = true;
        ({ items, messages } = await readCategoryPage(page, useDataWrapper));
      }

      pagesRead += 1;
      lastMessages = messages;
      scanned += items.length;

      for (const entry of items) {
        const category = toCategory(entry);
        if (category && keywords.some((keyword) => category.name.toLowerCase().includes(keyword))) {
          matches.push(category);
        }
      }

      if (items.length < ITEMS_PER_PAGE) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        keywords,
        pagesRead,
        scannedCategories: scanned,
        bodyShape: useDataWrapper ? 'data_wrapper' : 'top_level',
        truncated: pagesRead >= maxPages && scanned >= maxPages * ITEMS_PER_PAGE,
        count: matches.length,
        matches,
        messages: lastMessages
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'category_search_failed'
      },
      {
        status: 500
      }
    );
  }
}
