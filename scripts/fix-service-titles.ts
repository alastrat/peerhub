/**
 * Adjust service titles to match the exact wording the team requested
 * (Screenshot 2026-04-23 at 8.24.46 PM).
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

const fixes: Array<{
  id: string;
  current: string;
  title: { es: string; en: string };
}> = [
  {
    id: "yGfvBsyUtcrzDdPhZYQKpF",
    current: "Diseño y Transformación cultural",
    title: {
      es: "Transformación Cultural",
      en: "Cultural Transformation",
    },
  },
  {
    id: "yGfvBsyUtcrzDdPhZYQL4n",
    current: "Seleccion Especializada",
    title: {
      es: "Selección Especializada",
      en: "Specialized Selection",
    },
  },
  {
    id: "yGfvBsyUtcrzDdPhZYQLKL",
    current: "Desarrollo de liderazgo estratégico",
    title: {
      es: "Desarrollo de Liderazgo Estratégico",
      en: "Strategic Leadership Development",
    },
  },
];

async function main() {
  console.log("Fixing service titles in dataset:", process.env.NEXT_PUBLIC_SANITY_DATASET);
  for (const fix of fixes) {
    await client.patch(fix.id).set({ title: fix.title }).commit();
    console.log(`  ✅ "${fix.current}" → "${fix.title.es}"`);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
