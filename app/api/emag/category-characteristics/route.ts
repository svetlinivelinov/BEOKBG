import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';

type CharacteristicInfo = {
  id: number;
  name: string | null;
  typeId: number | null;
  isMandatory: boolean;
  allowNewValue: boolean;
  valuesCount: number;
  values: string[];
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

function toFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function toValueText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  const record = asRecord(value);
  if (record && typeof record.value === 'string') {
    return record.value;
  }

  return typeof value === 'number' ? String(value) : null;
}

function toCharacteristic(entry: unknown, maxValues: number): CharacteristicInfo | null {
  const source = asRecord(entry);
  const id = toNumberOrNull(source?.id);
  if (!source || id === null) {
    return null;
  }

  const allValues = Array.isArray(source.values)
    ? source.values.map(toValueText).filter((item): item is string => item !== null)
    : [];

  return {
    id: Math.floor(id),
    name: typeof source.name === 'string' ? source.name : null,
    typeId: toNumberOrNull(source.type_id),
    isMandatory: toFlag(source.is_mandatory),
    allowNewValue: toFlag(source.allow_new_value),
    valuesCount: allValues.length,
    values: allValues.slice(0, maxValues)
  };
}

type FamilyTypeInfo = {
  id: number;
  name: string | null;
  characteristics: Array<{
    characteristicId: number | null;
    characteristicName: string | null;
    displayMethod: number | null;
    isFoldable: boolean;
  }>;
};

function toFamilyType(entry: unknown, characteristicNames: Map<number, string | null>): FamilyTypeInfo | null {
  const source = asRecord(entry);
  const id = toNumberOrNull(source?.id);
  if (!source || id === null) {
    return null;
  }

  const characteristics = (Array.isArray(source.characteristics) ? source.characteristics : [])
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => {
      const characteristicId = toNumberOrNull(item.characteristic_id);
      return {
        characteristicId,
        characteristicName: characteristicId === null ? null : characteristicNames.get(characteristicId) ?? null,
        displayMethod: toNumberOrNull(item.characteristic_family_type_id),
        isFoldable: toFlag(item.is_foldable)
      };
    });

  return {
    id: Math.floor(id),
    name: typeof source.name === 'string' ? source.name : null,
    characteristics
  };
}

async function readCategory(
  categoryId: number,
  useDataWrapper: boolean
): Promise<Record<string, unknown> | null> {
  const filters = { id: categoryId, valuesCurrentPage: 1, valuesPerPage: 256 };
  const raw = asRecord(
    await getEmagClient().post<unknown>('/category/read?language=BG', useDataWrapper ? { data: filters } : filters)
  );
  const results = raw?.results;

  return Array.isArray(results) ? asRecord(results[0]) : asRecord(results);
}

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const categoryId = Number(url.searchParams.get('id') ?? '');
  const requestedMaxValues = Number(url.searchParams.get('maxValues') ?? '60');
  const maxValues = Number.isFinite(requestedMaxValues) ? Math.min(256, Math.max(0, Math.floor(requestedMaxValues))) : 60;

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ success: false, error: 'invalid_category_id' }, { status: 400 });
  }

  try {
    let useDataWrapper = false;
    let category = await readCategory(categoryId, false);

    // Some accounts only accept the documented `data` wrapper for reads.
    if (!category) {
      useDataWrapper = true;
      category = await readCategory(categoryId, true);
    }

    if (!category) {
      return NextResponse.json({ success: false, error: 'category_not_found' }, { status: 404 });
    }

    const characteristics = (Array.isArray(category.characteristics) ? category.characteristics : [])
      .map((entry) => toCharacteristic(entry, maxValues))
      .filter((entry): entry is CharacteristicInfo => entry !== null)
      .sort((left, right) => Number(right.isMandatory) - Number(left.isMandatory) || left.id - right.id);

    const characteristicNames = new Map<number, string | null>(
      characteristics.map((item) => [item.id, item.name] as [number, string | null])
    );
    const familyTypes = (Array.isArray(category.family_types) ? category.family_types : [])
      .map((entry) => toFamilyType(entry, characteristicNames))
      .filter((entry): entry is FamilyTypeInfo => entry !== null);

    return NextResponse.json({
      success: true,
      data: {
        bodyShape: useDataWrapper ? 'data_wrapper' : 'top_level',
        category: {
          id: toNumberOrNull(category.id),
          name: typeof category.name === 'string' ? category.name : null,
          parentId: toNumberOrNull(category.parent_id),
          isAllowed: toNumberOrNull(category.is_allowed),
          isEanMandatory: toFlag(category.is_ean_mandatory),
          isWarrantyMandatory: toFlag(category.is_warranty_mandatory)
        },
        mandatoryCharacteristicIds: characteristics.filter((item) => item.isMandatory).map((item) => item.id),
        familyTypes,
        characteristics
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'category_characteristics_failed'
      },
      {
        status: 500
      }
    );
  }
}
