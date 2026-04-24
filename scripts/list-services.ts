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

(async () => {
  const services = await client.fetch<
    Array<{ _id: string; title?: { es?: string; en?: string }; order?: number; slug?: { current?: string } }>
  >(`*[_type == "service"] | order(order asc)`);
  console.log(`Found ${services.length} services:`);
  for (const s of services) {
    console.log(`  [${s.order ?? "?"}] ${s.title?.es || "—"} (${s.slug?.current || "no-slug"}) / ${s._id}`);
  }
})();
