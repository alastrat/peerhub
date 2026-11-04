#!/usr/bin/env node
/**
 * Scopes the class-based rules of the marketing site's vendored CSS to
 * `[data-website]` (set by src/app/[locale]/(website)/layout.tsx).
 *
 * Bootstrap's utilities (`.p-4`, `.gap-3`, `.border`, `.shadow-sm`, `.rounded`, …)
 * share names with Tailwind's but carry `!important` and different values, and
 * bizzen's spacing helpers (`.mt-10` = 10px) and Bootstrap components
 * (`.container`) win over Tailwind by load order. Scoped, they only apply on the
 * marketing site, so the app (including portaled dialogs) gets plain Tailwind.
 * `:where()` keeps their specificity unchanged. Rules without a class selector
 * (`:root` variables, reboot element styles) stay global.
 *
 * Idempotent. Re-run after replacing either file with a fresh copy:
 *   node scripts/scope-website-css.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const SCOPE = ":where([data-website])";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["src/styles/bizzen/plugins/bootstrap.min.css", "src/styles/bizzen/spacings.css"];

const hasClass = (selector) => /\.[A-Za-z_-]/.test(selector);

for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  const root = postcss.parse(fs.readFileSync(filePath, "utf8"), { from: filePath });
  let scoped = 0;

  root.walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name.endsWith("keyframes")) return;
    const selectors = rule.selectors;
    if (!selectors.some((s) => hasClass(s) && !s.startsWith(SCOPE))) return;
    // Keep the file's own separator so the minified file stays minified
    const separator = rule.selector.match(/,\s*/)?.[0] ?? ",";
    rule.selector = selectors
      .map((s) => {
        if (!hasClass(s) || s.startsWith(SCOPE)) return s;
        scoped++;
        return `${SCOPE} ${s}`;
      })
      .join(separator);
  });

  fs.writeFileSync(filePath, root.toString());
  console.log(`${file}: scoped ${scoped} selectors`);
}
