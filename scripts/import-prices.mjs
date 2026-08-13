#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

const projectRoot = process.cwd();
const productsPath = path.join(projectRoot, 'data', 'products', 'products.json');

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

const filePath = getArg('file', '');
const sheetNameArg = getArg('sheet', '');
const dryRun = args.includes('--dry-run');
const help = args.includes('--help') || args.includes('-h');

if (help || !filePath) {
  console.log('Usage: npm run prices:import -- --file "<path-to-prices.xlsx>" [--sheet "Sheet1"] [--dry-run]');
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

function findHeaderKey(headers, allowed) {
  return headers.find((header) => allowed.includes(normalizeHeader(header))) || null;
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

if (!idHeader || !finalPriceHeader) {
  console.error('Could not detect required columns. Required: identifier (id/model) and final price.');
  console.error(`Detected headers: ${headers.join(', ')}`);
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const byId = new Map(products.map((product) => [String(product.id).trim().toLowerCase(), product]));
const byModel = new Map(products.map((product) => [String(product.model).trim().toLowerCase(), product]));

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

  if (finalPrice === null || finalPrice < 0) {
    invalidPriceRows.push(identifier);
    continue;
  }

  const nextFinalPrice = Number(finalPrice.toFixed(2));
  const nextQty = qty === null || qty < 0 ? null : Math.floor(qty);
  const nextMargin = margin === null ? null : Number(margin.toFixed(2));

  const changed =
    product.currency !== 'EUR' ||
    product.priceQty !== nextQty ||
    product.competitorAmazonPriceInclVatEur !== nextFinalPrice ||
    product.finalPriceEur !== nextFinalPrice ||
    product.marginEur !== nextMargin;

  product.currency = 'EUR';
  product.priceQty = nextQty;
  product.competitorAmazonPriceInclVatEur = nextFinalPrice;
  product.finalPriceEur = nextFinalPrice;
  product.marginEur = nextMargin;
  product.priceUpdatedAt = new Date().toISOString();

  if (changed) {
    updatedCount += 1;
  }
}

if (!dryRun) {
  fs.writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
}

console.log(`Sheet: ${activeSheetName}`);
console.log(`Rows parsed: ${rows.length}`);
console.log(`Matched products: ${matchedCount}`);
console.log(`Updated products: ${updatedCount}`);
console.log(`Unknown identifiers: ${unknownIdentifiers.length}`);
console.log(`Rows with invalid final price: ${invalidPriceRows.length}`);

if (unknownIdentifiers.length) {
  console.log('Unknown identifiers sample:', unknownIdentifiers.slice(0, 10).join(', '));
}

if (invalidPriceRows.length) {
  console.log('Invalid price sample:', invalidPriceRows.slice(0, 10).join(', '));
}

if (dryRun) {
  console.log('Dry run mode: products.json was not modified.');
}
