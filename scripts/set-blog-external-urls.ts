/**
 * Sets the externalUrl field on the 3 blog posts created by
 * apply-web-feedback-2026-04-22.ts.
 *
 * Run once: ./node_modules/.bin/tsx scripts/set-blog-external-urls.ts
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

const mapping: { slug: string; externalUrl: string }[] = [
  {
    slug: "cultura-organizacional-fusiones-auna-colombia",
    externalUrl:
      "https://www.linkedin.com/pulse/el-papel-de-la-cultura-organizacional-en-fusiones-boom/",
  },
  {
    slug: "cultura-alineada-con-estrategia",
    externalUrl:
      "https://www.linkedin.com/pulse/qu%C3%A9-tan-alineada-est%C3%A1-tu-cultura-con-la-estrategia-iskya-boom/",
  },
  {
    slug: "cultura-seguridad-psicologica-chow-time-plurum",
    externalUrl: "https://open.spotify.com/show/7GT7U9GKfjOoVshWQdOMRv",
  },
];

async function main() {
  console.log(
    "Setting externalUrl on blog posts in dataset:",
    process.env.NEXT_PUBLIC_SANITY_DATASET
  );

  for (const { slug, externalUrl } of mapping) {
    const post = await client.fetch<{ _id: string } | null>(
      `*[_type == "post" && slug.current == $slug][0]{ _id }`,
      { slug }
    );

    if (!post) {
      console.log(`  ⚠️  post "${slug}" not found — skipping`);
      continue;
    }

    await client.patch(post._id).set({ externalUrl }).commit();
    console.log(`  ✅ ${slug} → ${externalUrl}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
