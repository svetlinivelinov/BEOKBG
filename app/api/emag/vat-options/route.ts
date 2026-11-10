import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';

type VatOption = {
  id: number;
  name: string | null;
  value: number | null;
  raw: Record<string, unknown>;
};

type EmagLikeResponse = {
  isError?: boolean;
  messages?: string[];
  results?: unknown;
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

function parseVatOptions(results: unknown): VatOption[] {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item): VatOption | null => {
      const source = asRecord(item);
      if (!source) {
        return null;
      }

      const id = toNumberOrNull(source.id);
      if (id === null) {
        return null;
      }

      const nameCandidate = typeof source.name === 'string'
        ? source.name
        : typeof source.label === 'string'
          ? source.label
          : typeof source.title === 'string'
            ? source.title
            : null;
      const valueCandidate = source.value ?? source.rate ?? source.vat_value ?? source.percent;

      return {
        id: Math.floor(id),
        name: nameCandidate ? nameCandidate.trim() : null,
        value: toNumberOrNull(valueCandidate),
        raw: source
      };
    })
    .filter((item): item is VatOption => Boolean(item))
    .sort((left, right) => left.id - right.id);
}

function asEmagLikeResponse(value: unknown): EmagLikeResponse {
  const source = asRecord(value);
  if (!source) {
    return {};
  }

  return {
    isError: typeof source.isError === 'boolean' ? source.isError : undefined,
    messages: Array.isArray(source.messages)
      ? source.messages.filter((item): item is string => typeof item === 'string')
      : undefined,
    results: source.results
  };
}

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const client = getEmagClient();
    const candidates: Array<{ label: string; body: Record<string, unknown> }> = [
      { label: 'top_level_empty', body: {} },
      { label: 'data_wrapper_empty', body: { data: {} } }
    ];

    let pickedLabel = candidates[0].label;
    let pickedResponse: EmagLikeResponse = {};
    let vatOptions: VatOption[] = [];
    const attempts: Array<{ label: string; isError: boolean; messages: string[]; count: number }> = [];

    for (const candidate of candidates) {
      const raw = await client.post<unknown>('/vat/read', candidate.body);
      const parsed = asEmagLikeResponse(raw);
      const options = parseVatOptions(parsed.results);
      attempts.push({
        label: candidate.label,
        isError: Boolean(parsed.isError),
        messages: parsed.messages ?? [],
        count: options.length
      });

      if (options.length > 0) {
        pickedLabel = candidate.label;
        pickedResponse = parsed;
        vatOptions = options;
        break;
      }

      if (pickedResponse.results === undefined) {
        pickedLabel = candidate.label;
        pickedResponse = parsed;
        vatOptions = options;
      }
    }

    return NextResponse.json({
      success: !pickedResponse.isError,
      data: {
        source: pickedLabel,
        attempts,
        count: vatOptions.length,
        vatOptions,
        messages: pickedResponse.messages ?? [],
        isError: Boolean(pickedResponse.isError)
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'vat_read_failed'
      },
      {
        status: 500
      }
    );
  }
}
