#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const productsPath = path.join(projectRoot, 'data', 'products', 'products.json');
const defaultSource = path.join(projectRoot, 'public', 'BEOK Pictures 2026', 'Pictures-0819');

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

const sourceArg = getArg('source', defaultSource);
const mapArg = getArg('map', '');
const apply = args.includes('--apply');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log('Usage: npm run images:import -- [--source "public/BEOK Pictures 2026/Pictures-0819"] [--map "product-id=FOLDER_NAME,other-id=OTHER_FOLDER"] [--apply]');
  console.log('Default mode is dry-run. Use --apply to copy files and update products.json.');
  process.exit(0);
}

const sourceRoot = path.resolve(projectRoot, sourceArg);
if (!fs.existsSync(productsPath)) {
  console.error(`products.json not found: ${productsPath}`);
  process.exit(1);
}

if (!fs.existsSync(sourceRoot)) {
  console.error(`Source folder not found: ${sourceRoot}`);
  process.exit(1);
}

function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function splitAlphaNumTokens(value) {
  return String(value ?? '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isImageFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
}

function compareNatural(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function sourceBaseName(fileName) {
  const withoutExt = path.basename(fileName, path.extname(fileName));
  return withoutExt
    .replace(/\s*\(\d+\)\s*$/i, '')
    .replace(/[-_ ]\d+$/i, '')
    .trim();
}

function collectFoldersWithImages(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const folders = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const folderPath = path.join(rootDir, entry.name);
    const files = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((child) => child.isFile() && isImageFile(child.name))
      .map((child) => path.join(folderPath, child.name))
      .sort((a, b) => compareNatural(path.basename(a), path.basename(b)));

    if (files.length > 0) {
      folders.push({
        name: entry.name,
        path: folderPath,
        files,
        normalizedName: normalizeKey(entry.name),
        tokens: splitAlphaNumTokens(entry.name)
      });
    }
  }

  const rootFiles = entries
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) => path.join(rootDir, entry.name));

  if (rootFiles.length > 0) {
    const grouped = new Map();

    for (const filePath of rootFiles) {
      const key = sourceBaseName(filePath);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key).push(filePath);
    }

    for (const [groupName, files] of grouped) {
      const sorted = files.sort((a, b) => compareNatural(path.basename(a), path.basename(b)));
      folders.push({
        name: groupName,
        path: rootDir,
        files: sorted,
        normalizedName: normalizeKey(groupName),
        tokens: splitAlphaNumTokens(groupName)
      });
    }
  }

  return folders;
}

function parseManualMap(raw) {
  if (!raw.trim()) {
    return new Map();
  }

  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [left, right] = entry.split('=');
      return {
        productId: String(left ?? '').trim(),
        folderName: String(right ?? '').trim()
      };
    })
    .filter((entry) => entry.productId && entry.folderName);

  const map = new Map();
  for (const entry of entries) {
    map.set(entry.productId.toLowerCase(), normalizeKey(entry.folderName));
  }

  return map;
}

function pickFoldersForProduct(product, folders) {
  const model = String(product.model ?? '');
  const id = String(product.id ?? '');
  const modelNorm = normalizeKey(model);
  const idNorm = normalizeKey(id);
  const modelTokens = splitAlphaNumTokens(model);

  const exactFolders = folders.filter((folder) => folder.normalizedName === modelNorm || folder.normalizedName === idNorm);
  if (exactFolders.length > 0) {
    return exactFolders;
  }

  const prefixFolders = folders.filter((folder) => modelNorm.startsWith(folder.normalizedName));
  if (prefixFolders.length > 0) {
    return prefixFolders;
  }

  const tokenFolders = folders.filter((folder) => {
    if (folder.tokens.length === 0) {
      return false;
    }

    return folder.tokens.every((token) => modelTokens.includes(token));
  });

  return tokenFolders;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toPublicPath(absPath) {
  const normalized = absPath.replace(/\\/g, '/');
  const publicRoot = path.join(projectRoot, 'public').replace(/\\/g, '/');
  if (normalized.startsWith(publicRoot)) {
    return normalized.slice(publicRoot.length);
  }

  return normalized.replace(projectRoot.replace(/\\/g, '/'), '');
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
if (!Array.isArray(products)) {
  console.error('products.json must be an array.');
  process.exit(1);
}

const folders = collectFoldersWithImages(sourceRoot);
const manualMap = parseManualMap(mapArg);
if (folders.length === 0) {
  console.error(`No image folders or image files found in: ${sourceRoot}`);
  process.exit(1);
}

let matchedProducts = 0;
let updatedProducts = 0;
const unmatched = [];
const appliedCopies = [];

for (const product of products) {
  const manualFolder = manualMap.get(String(product.id ?? '').toLowerCase()) || null;
  const selectedFolders = manualFolder
    ? folders.filter((folder) => folder.normalizedName === manualFolder)
    : pickFoldersForProduct(product, folders);
  if (selectedFolders.length === 0) {
    unmatched.push(`${product.id} (${product.model})`);
    continue;
  }

  const sourceFiles = Array.from(new Set(selectedFolders.flatMap((folder) => folder.files)));
  if (sourceFiles.length === 0) {
    unmatched.push(`${product.id} (${product.model})`);
    continue;
  }

  matchedProducts += 1;

  const productImageDir = path.join(projectRoot, 'public', 'images', 'products', product.id);
  const nextImagePaths = [];

  sourceFiles.forEach((sourceFile, index) => {
    const ext = path.extname(sourceFile).toLowerCase() === '.jpeg' ? '.jpg' : path.extname(sourceFile).toLowerCase();
    const fileName = `${product.id}-${String(index + 1).padStart(2, '0')}${ext}`;
    const destination = path.join(productImageDir, fileName);
    const publicPath = toPublicPath(destination);

    nextImagePaths.push(publicPath);

    if (apply) {
      ensureDir(productImageDir);
      fs.copyFileSync(sourceFile, destination);
      appliedCopies.push(publicPath);
    }
  });

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
console.log(`Source: ${sourceRoot}`);
console.log(`Folders with images: ${folders.length}`);
console.log(`Matched products: ${matchedProducts}`);
console.log(`Updated products: ${updatedProducts}`);
console.log(`Unmatched products: ${unmatched.length}`);
if (manualMap.size > 0) {
  console.log(`Manual mappings: ${manualMap.size}`);
}

if (unmatched.length > 0) {
  console.log('Unmatched sample:', unmatched.slice(0, 12).join(', '));
}

if (apply) {
  console.log(`Copied images: ${appliedCopies.length}`);
  console.log('products.json updated.');
} else {
  console.log('Dry run only. Use --apply to copy files and update products.json.');
}
