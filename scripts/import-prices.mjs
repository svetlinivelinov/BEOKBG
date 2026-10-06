#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

const projectRoot = process.cwd();
const productsPath = path.join(projectRoot, 'data', 'products', 'products.json');
const overridesPath = path.join(projectRoot, 'data', 'products', 'emag.overrides.json');

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const prefixed = `--${name}=`;
  const exact = args.find((arg) => arg.startsWith(prefixed));
  if (exact) {
    return exact.slice(prefixed.length).trim();
  }

  const index = args.findIndex((arg) => arg === `--${name}`);
  if (index !== -1 && args[index + 1]) {
    return String(args[index + 1]).trim();
  }

  return fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

const filePath = getArg('file', '');
const sheetNameArg = getArg('sheet', '');
const overridesSheetNameArg = getArg('overrides-sheet', 'emag_overrides');
const useOverridesSheet = hasFlag('use-overrides-sheet');
const dryRun = hasFlag('dry-run');
const help = hasFlag('help') || hasFlag('h');

if (help || !filePath) {
  console.log(
    'Usage: npm run prices:import -- --file "<path-to-prices.xlsx>" [--sheet "Sheet1"] [--dry-run] [--use-overrides-sheet --overrides-sheet "emag_overrides"]'
  );
  process.exit(help ? 0 : 1);
}

const resolvedFilePath = path.resolve(projectRoot, filePath);
if (!fs.existsSync(resolvedFilePath)) {
  console.error(`Price file not found: ${resolvedFilePath}`);
  process.exit(1);
}

if (!fs.existsSync(productsPath)) {
  console.error(`Products metadata not found: ${productsPath}`);
  process.exit(1);
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/,/g, '.');

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function parseText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function findHeaderKey(headers, allowed) {
  return headers.find((header) => allowed.includes(normalizeHeader(header))) || null;
}

const identifierHeaders = ['id', 'product id', 'slug', 'model', 'sku', 'code', 'model number', 'модел'];
const qtyHeaders = ['qty', 'quantity', 'количество'];
const marginHeaders = ['margin', 'margin eur', 'margin€', 'markup', 'надценка', 'марж'];
const finalPriceHeaders = [
  'competitor amazon price (incl. vat)',
  'competitor amazon price incl. vat',
  'final price',
  'final price eur',
  'price',
  'price eur',
  'eur',
  'крайна цена',
  'цена'
];
const eanHeaders = ['ean', 'barcode', 'bar code', 'gtin'];

const brandHeaders = ['brand', 'марка'];
const stockHeaders = ['stock', 'qty', 'quantity', 'наличност'];
const descriptionHeaders = ['description', 'desc', 'описание'];
const weightHeaders = ['weight', 'weight grams', 'тегло'];
const widthHeaders = ['width', 'ширина'];
const heightHeaders = ['height', 'височина'];
const lengthHeaders = ['length', 'дължина'];

function readOverridesFile() {
  if (!fs.existsSync(overridesPath)) {
    return { products: [] };
  }

  try {
    const raw = fs.readFileSync(overridesPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.products)) {
      return { products: [] };
    }

    return parsed;
  } catch {
    return { products: [] };
  }
}

function parseOverridesSheet(workbook, sheetName, productsByLookup, existingOverridesById) {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return {
      found: false,
      rows: 0,
      updated: 0,
      removed: 0,
      unknown: []
    };
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (!rows.length) {
    return {
      found: true,
      rows: 0,
      updated: 0,
      removed: 0,
      unknown: []
    };
  }

  const headers = Object.keys(rows[0]);
  const idHeader = findHeaderKey(headers, identifierHeaders);
  const brandHeader = findHeaderKey(headers, brandHeaders);
  const eanHeader = findHeaderKey(headers, eanHeaders);
  const stockHeader = findHeaderKey(headers, stockHeaders);
  const descriptionHeader = findHeaderKey(headers, descriptionHeaders);
  const weightHeader = findHeaderKey(headers, weightHeaders);
  const widthHeader = findHeaderKey(headers, widthHeaders);
  const heightHeader = findHeaderKey(headers, heightHeaders);
  const lengthHeader = findHeaderKey(headers, lengthHeaders);

  if (!idHeader) {
    return {
      found: true,
      rows: rows.length,
      updated: 0,
      removed: 0,
      unknown: [],
      error: 'Overrides sheet found but missing identifier column (id/model).'
    };
  }

  const unknown = [];
  let updated = 0;
  let removed = 0;

  for (const row of rows) {
    const identifier = String(row[idHeader] ?? '').trim();
    if (!identifier) {
      continue;
    }

    const product = productsByLookup.get(identifier.toLowerCase());
    if (!product) {
      unknown.push(identifier);
      continue;
    }

    const productId = product.id;
    const existing = existingOverridesById.get(productId) || { id: productId };
    const next = { ...existing, id: productId };

    if (brandHeader) {
      const value = parseText(row[brandHeader], 80);
      if (value) {
        next.brand = value;
      } else {
        delete next.brand;
      }
    }

    if (eanHeader) {
      const value = parseText(row[eanHeader], 32);
      if (value) {
        next.ean = value;
      } else {
        delete next.ean;
      }
    }

    if (stockHeader) {
      const value = parseNumber(row[stockHeader]);
      if (value !== null && value >= 0) {
        next.stock = Math.floor(value);
      } else {
        delete next.stock;
      }
    }

    if (descriptionHeader) {
      const value = parseText(row[descriptionHeader], 4000);
      if (value) {
        next.description = value;
      } else {
        delete next.description;
      }
    }

    if (weightHeader) {
      const value = parseNumber(row[weightHeader]);
      if (value !== null && value > 0) {
        next.weight = value;
      } else {
        delete next.weight;
      }
    }

    if (widthHeader) {
      const value = parseNumber(row[widthHeader]);
      if (value !== null && value > 0) {
        next.width = value;
      } else {
        delete next.width;
      }
    }

    if (heightHeader) {
      const value = parseNumber(row[heightHeader]);
      if (value !== null && value > 0) {
        next.height = value;
      } else {
        delete next.height;
      }
    }

    if (lengthHeader) {
      const value = parseNumber(row[lengthHeader]);
      if (value !== null && value > 0) {
        next.length = value;
      } else {
        delete next.length;
      }
    }

    const hasCustomField = [
      next.brand,
      next.ean,
      next.stock,
      next.description,
      next.weight,
      next.width,
      next.height,
      next.length
    ].some((value) => value !== undefined);

    if (hasCustomField) {
      const changed = JSON.stringify(existing) !== JSON.stringify(next);
      existingOverridesById.set(productId, next);
      if (changed) {
        updated += 1;
      }
    } else if (existingOverridesById.has(productId)) {
      existingOverridesById.delete(productId);
      removed += 1;
    }
  }

  return {
    found: true,
    rows: rows.length,
    updated,
    removed,
    unknown
  };
}

const workbook = XLSX.readFile(resolvedFilePath);
const activeSheetName = sheetNameArg || workbook.SheetNames[0];
const worksheet = workbook.Sheets[activeSheetName];

if (!worksheet) {
  console.error(`Sheet not found: ${activeSheetName}`);
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
if (!rows.length) {
  console.error('No rows found in the selected sheet.');
  process.exit(1);
}

const headers = Object.keys(rows[0]);
const idHeader = findHeaderKey(headers, identifierHeaders);
const qtyHeader = findHeaderKey(headers, qtyHeaders);
const marginHeader = findHeaderKey(headers, marginHeaders);
const finalPriceHeader = findHeaderKey(headers, finalPriceHeaders);
const eanHeader = findHeaderKey(headers, eanHeaders);

if (!idHeader || !finalPriceHeader) {
  console.error('Could not detect required columns. Required: identifier (id/model) and final price.');
  console.error(`Detected headers: ${headers.join(', ')}`);
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const byId = new Map(products.map((product) => [String(product.id).trim().toLowerCase(), product]));
const byModel = new Map(products.map((product) => [String(product.model).trim().toLowerCase(), product]));
const productsByLookup = new Map([...byId.entries(), ...byModel.entries()]);

let matchedCount = 0;
let updatedCount = 0;
const unknownIdentifiers = [];
const invalidPriceRows = [];

for (const row of rows) {
  const identifier = String(row[idHeader] ?? '').trim();
  if (!identifier) {
    continue;
  }

  const lookupKey = identifier.toLowerCase();
  const product = byId.get(lookupKey) || byModel.get(lookupKey);

  if (!product) {
    unknownIdentifiers.push(identifier);
    continue;
  }

  matchedCount += 1;

  const qty = qtyHeader ? parseNumber(row[qtyHeader]) : null;
  const finalPrice = parseNumber(row[finalPriceHeader]);
  const margin = marginHeader ? parseNumber(row[marginHeader]) : null;
  const ean = eanHeader ? parseText(row[eanHeader], 32) : '';

  if (finalPrice === null || finalPrice < 0) {
    invalidPriceRows.push(identifier);
    continue;
  }

  const nextFinalPrice = Number(finalPrice.toFixed(2));
  const nextQty = qty === null || qty < 0 ? null : Math.floor(qty);
  const nextMargin = margin === null ? null : Number(margin.toFixed(2));

  const changed =
    product.currency !== 'EUR' ||
    (product.ean || '') !== ean ||
    product.priceQty !== nextQty ||
    product.competitorAmazonPriceInclVatEur !== nextFinalPrice ||
    product.finalPriceEur !== nextFinalPrice ||
    product.marginEur !== nextMargin;

  product.currency = 'EUR';
  product.ean = ean || undefined;
  product.priceQty = nextQty;
  product.competitorAmazonPriceInclVatEur = nextFinalPrice;
  product.finalPriceEur = nextFinalPrice;
  product.marginEur = nextMargin;
  product.priceUpdatedAt = new Date().toISOString();

  if (changed) {
    updatedCount += 1;
  }
}

const existingOverrides = readOverridesFile();
const existingOverridesById = new Map(
  (existingOverrides.products || [])
    .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
    .map((item) => [item.id, { ...item }])
);

const overrideReport = useOverridesSheet
  ? parseOverridesSheet(workbook, overridesSheetNameArg, productsByLookup, existingOverridesById)
  : {
      found: false,
      rows: 0,
      updated: 0,
      removed: 0,
      unknown: []
    };

if (overrideReport.error) {
  console.error(overrideReport.error);
  process.exit(1);
}

if (!dryRun) {
  fs.writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');

  if (useOverridesSheet) {
    const overridesPayload = {
      products: Array.from(existingOverridesById.values()).sort((a, b) => String(a.id).localeCompare(String(b.id)))
    };

    fs.writeFileSync(overridesPath, `${JSON.stringify(overridesPayload, null, 2)}\n`, 'utf8');
  }
}

console.log(`Sheet: ${activeSheetName}`);
console.log(`Rows parsed: ${rows.length}`);
console.log(`Matched products: ${matchedCount}`);
console.log(`Updated products: ${updatedCount}`);
console.log(`Unknown identifiers: ${unknownIdentifiers.length}`);
console.log(`Rows with invalid final price: ${invalidPriceRows.length}`);
console.log(`EAN column detected: ${eanHeader ? 'yes' : 'no'}`);

if (useOverridesSheet) {
  console.log(`Overrides sheet: ${overridesSheetNameArg}`);
  console.log(`Overrides sheet found: ${overrideReport.found ? 'yes' : 'no'}`);
  console.log(`Overrides rows parsed: ${overrideReport.rows}`);
  console.log(`Overrides updated: ${overrideReport.updated}`);
  console.log(`Overrides removed: ${overrideReport.removed}`);
  console.log(`Overrides unknown identifiers: ${overrideReport.unknown.length}`);

  if (overrideReport.unknown.length) {
    console.log('Overrides unknown sample:', overrideReport.unknown.slice(0, 10).join(', '));
  }
}

if (unknownIdentifiers.length) {
  console.log('Unknown identifiers sample:', unknownIdentifiers.slice(0, 10).join(', '));
}

if (invalidPriceRows.length) {
  console.log('Invalid price sample:', invalidPriceRows.slice(0, 10).join(', '));
}

if (dryRun) {
  console.log(
    useOverridesSheet
      ? 'Dry run mode: products.json and emag.overrides.json were not modified.'
      : 'Dry run mode: products.json was not modified.'
  );
}
