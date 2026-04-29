/**
 * Seeds the `homePage` singleton with the services-section text taken from
 * src/messages/{es,en}.json so the site renders the same copy as before
 * while editors gain control in Studio.
 *
 * Idempotent: only fills fields that aren't already set.
 *
 * Run once:  ./node_modules/.bin/tsx scripts/seed-home-page.ts
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

const HOME_DOC_ID = "homePage";

// Current copy (from src/messages/{es,en}.json — keep in sync if those change
// before this script is run for the first time).
const seed = {
  servicesSubtitle: {
    es: "Nuestros Servicios",
    en: "Our Services",
  },
  servicesTitle: {
    es: "Soluciones integrales para el crecimiento de tu organización",
    en: "Comprehensive solutions for your organization's growth",
  },
  servicesDescription: {
    es: "Ofrecemos servicios especializados en consultoría organizacional para potenciar el talento y la cultura de tu empresa.",
    en: "We offer specialized organizational consulting services to enhance your company's talent and culture.",
  },
};

async function main() {
  console.log("Seeding homePage in dataset:", process.env.NEXT_PUBLIC_SANITY_DATASET);

  const existing = await client.fetch<{
    _id: string;
    servicesSubtitle?: { es?: string; en?: string };
    servicesTitle?: { es?: string; en?: string };
    servicesDescription?: { es?: string; en?: string };
  } | null>(`*[_id == $id][0]`, { id: HOME_DOC_ID });

  if (!existing) {
    await client.createOrReplace({
      _id: HOME_DOC_ID,
      _type: "homePage",
      ...seed,
    });
    console.log(`  ✅ created homePage with seed values`);
    return;
  }

  // Document exists — only fill empty fields so we don't clobber editor changes.
  const patch: Record<string, unknown> = {};
  if (!existing.servicesSubtitle?.es) patch.servicesSubtitle = seed.servicesSubtitle;
  if (!existing.servicesTitle?.es) patch.servicesTitle = seed.servicesTitle;
  if (!existing.servicesDescription?.es) patch.servicesDescription = seed.servicesDescription;

  if (Object.keys(patch).length === 0) {
    console.log("  ⏭  homePage already populated — nothing to do");
    return;
  }

  await client.patch(HOME_DOC_ID).set(patch).commit();
  console.log(`  ✅ patched: ${Object.keys(patch).join(", ")}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
