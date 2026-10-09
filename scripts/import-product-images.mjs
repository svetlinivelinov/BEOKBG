#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const productsPath = path.join(projectRoot, 'data', 'products', 'products.json');
const imagesRoot = path.join(projectRoot, 'public', 'images', 'products');

const args = process.argv.slice(2);

const apply = args.includes('--apply');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log('Usage: npm run images:import -- [--apply]');
  console.log('Scans /public/images/products/<product-id> and syncs image/image[] in products.json.');
  console.log('This script never copies, renames, restores, or deletes files.');
  console.log('Default mode is dry-run. Use --apply to write changes to products.json.');
  process.exit(0);
}

if (!fs.existsSync(productsPath)) {
  console.error(`products.json not found: ${productsPath}`);
  process.exit(1);
}

if (!fs.existsSync(imagesRoot)) {
  console.error(`Images root not found: ${imagesRoot}`);
  process.exit(1);
}

function isImageFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext);
}

function compareNatural(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function collectImagesForProduct(productId) {
  const dirPath = path.join(imagesRoot, productId);
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) => `/images/products/${productId}/${entry.name}`)
    .sort(compareNatural);
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
if (!Array.isArray(products)) {
  console.error('products.json must be an array.');
  process.exit(1);
}

let productsWithImages = 0;
let updatedProducts = 0;
let clearedProducts = 0;

for (const product of products) {
  const nextImagePaths = collectImagesForProduct(product.id);
  if (nextImagePaths.length > 0) {
    productsWithImages += 1;
  } else {
    clearedProducts += 1;
  }

  const nextPrimary = nextImagePaths[0] ?? null;
  const changed =
    product.image !== nextPrimary ||
    JSON.stringify(product.images ?? []) !== JSON.stringify(nextImagePaths);

  product.image = nextPrimary;
  product.images = nextImagePaths;

  if (changed) {
    updatedProducts += 1;
  }
}

if (apply) {
  fs.writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
}

console.log(`Mode: ${apply ? 'apply' : 'dry-run'}`);
console.log(`Images root: ${imagesRoot}`);
console.log(`Products with images: ${productsWithImages}`);
console.log(`Products without images: ${clearedProducts}`);
console.log(`Updated products: ${updatedProducts}`);

if (apply) {
  console.log('products.json updated.');
} else {
  console.log('Dry run only. Use --apply to write changes to products.json.');
}
