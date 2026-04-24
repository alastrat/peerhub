/**
 * Align Sanity service slugs with the new titles.
 *
 *   cultura                → transformacion-cultural
 *   cambio                 → diagnostico-clima
 *   comunicacion-interna   → liderazgo
 *
 * seleccion-especializada stays as-is.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@sanity/client";

loadEnv({ path: ".env.local" });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const patches: Array<{ id: string; newSlug: string }> = [
  { id: "yGfvBsyUtcrzDdPhZYQKpF", newSlug: "transformacion-cultural" },
  { id: "3UaHYIPqqbTeb4fouOOkHr", newSlug: "diagnostico-clima" },
  { id: "yGfvBsyUtcrzDdPhZYQLKL", newSlug: "liderazgo" },
];

async function main() {
  console.log("Updating service slugs in dataset:", process.env.NEXT_PUBLIC_SANITY_DATASET);
  for (const p of patches) {
    await client
      .patch(p.id)
      .set({ slug: { _type: "slug", current: p.newSlug } })
      .commit();
    console.log(`  ✅ ${p.id} → ${p.newSlug}`);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
