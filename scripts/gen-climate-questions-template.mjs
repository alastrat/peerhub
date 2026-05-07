#!/usr/bin/env node
/**
 * Generate `public/climate-questions-template.xlsx` from the same row data as
 * the CSV template. Run via `npm run gen:climate-template`.
 *
 * The `xlsx` package is a devDependency only; this script is the sole
 * consumer in CI / local dev. The runtime parser uses `read-excel-file`.
 */

import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "public", "climate-questions-template.xlsx");

// Same five sample rows as `public/climate-questions-template.csv`.
// `required` is written as a JS boolean so Excel renders it as TRUE/FALSE.
const rows = [
  ["text", "type", "dimension", "required"],
  [
    "Mi líder me da retroalimentación oportuna",
    "LIKERT",
    "Liderazgo",
    true,
  ],
  [
    "Conozco las metas estratégicas de la organización",
    "LIKERT",
    "Comunicación",
    true,
  ],
  [
    "¿Qué te motivaría a quedarte un año más en la empresa?",
    "TEXT",
    "",
    false,
  ],
  [
    "En general, ¿qué tan probable es que recomiendes esta empresa como un buen lugar para trabajar?",
    "NPS",
    "",
    true,
  ],
  [
    "Califica la calidad de las herramientas de trabajo (1-5)",
    "RATING",
    "",
    true,
  ],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Preguntas");

const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(OUT_PATH, buffer);

console.log(`Wrote ${OUT_PATH}`);
