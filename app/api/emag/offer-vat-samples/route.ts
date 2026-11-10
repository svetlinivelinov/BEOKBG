import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';

type OfferVatSample = {
  id: number;
  partNumber: string | null;
  name: string | null;
  vatId: number | null;
  categoryId: number | null;
  status: number | null;
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toTextOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function parseOfferVatSamples(results: unknown): OfferVatSample[] {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item): OfferVatSample | null => {
      const source = asRecord(item);
      if (!source) {
        return null;
      }

      const id = toNumberOrNull(source.id);
      if (id === null) {
        return null;
      }

      return {
        id: Math.floor(id),
        partNumber: toTextOrNull(source.part_number),
        name: toTextOrNull(source.name),
        vatId: toNumberOrNull(source.vat_id),
        categoryId: toNumberOrNull(source.category_id),
        status: toNumberOrNull(source.status),
        raw: source
      };
    })
    .filter((item): item is OfferVatSample => Boolean(item));
}

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? '50');
  const safeLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.floor(limit))) : 50;

  try {
    const client = getEmagClient();
    const filters = { currentPage: 1, itemsPerPage: safeLimit };
    const candidates: Array<{ label: string; body: Record<string, unknown> }> = [
      { label: 'top_level_filters', body: filters },
      { label: 'data_wrapper_filters', body: { data: filters } }
    ];

    const attempts: Array<{ label: string; isError: boolean; messages: string[]; count: number; resultsType: string }> = [];
    let samples: OfferVatSample[] = [];
    let pickedLabel = candidates[0].label;
    let pickedMessages: string[] = [];
    let pickedIsError = false;

    for (const candidate of candidates) {
      const raw = asRecord(await client.post<unknown>('/product_offer/read', candidate.body)) ?? {};
      const results = raw.results;
      const parsedSamples = parseOfferVatSamples(results);
      const messages = Array.isArray(raw.messages)
        ? raw.messages.filter((item): item is string => typeof item === 'string')
        : [];

      attempts.push({
        label: candidate.label,
        isError: Boolean(raw.isError),
        messages,
        count: parsedSamples.length,
        resultsType: Array.isArray(results) ? 'array' : typeof results
      });

      if (parsedSamples.length > 0 || candidate === candidates[0]) {
        samples = parsedSamples;
        pickedLabel = candidate.label;
        pickedMessages = messages;
        pickedIsError = Boolean(raw.isError);
      }

      if (parsedSamples.length > 0) {
        break;
      }
    }

    const vatIdFrequency = samples.reduce<Record<string, number>>((acc, item) => {
      const key = item.vatId === null ? 'null' : String(Math.floor(item.vatId));
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: !pickedIsError,
      data: {
        source: pickedLabel,
        attempts,
        count: samples.length,
        samples,
        vatIdFrequency,
        messages: pickedMessages,
        isError: pickedIsError
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'offer_vat_samples_failed'
      },
      {
        status: 500
      }
    );
  }
}
