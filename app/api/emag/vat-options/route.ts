import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';

type VatOption = {
  id: number;
  name: string | null;
  value: number | null;
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

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const client = getEmagClient();
    const response = await client.postRead<unknown[]>('/vat/read', {});
    const vatOptions = parseVatOptions(response.results);

    return NextResponse.json({
      success: !response.isError,
      data: {
        count: vatOptions.length,
        vatOptions,
        messages: response.messages ?? [],
        isError: response.isError
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
