#!/usr/bin/env node
/**
 * Convertit img/aliments/*.png en WebP 96x96 (ce que l'app affiche),
 * puis supprime les PNG d'origine. ~8 Ko par image au lieu de ~1 Mo.
 *
 *   npm i sharp
 *   node tools/convertir-images-aliments.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DOSSIER = path.join(ICI, '..', 'img', 'aliments');

const pngs = fs.readdirSync(DOSSIER).filter(f => f.endsWith('.png'));
console.log(`${pngs.length} images a convertir.`);

let total = 0;
for (const f of pngs) {
  const src = path.join(DOSSIER, f);
  const dest = src.replace(/\.png$/, '.webp');
  await sharp(src).resize(96, 96, { fit: 'cover' }).webp({ quality: 78 }).toFile(dest);
  fs.unlinkSync(src);
  total += fs.statSync(dest).size;
}
console.log(`Termine. Poids total : ${(total / 1024 / 1024).toFixed(1)} Mo`);
