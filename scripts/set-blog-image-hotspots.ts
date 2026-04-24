/**
 * Sets hotspots on each blog post's mainImage so Sanity can crop
 * intelligently around the subject (face) regardless of output aspect ratio.
 *
 * Hotspot coordinates were eyeballed from the source image dimensions; the team
 * can fine-tune in the Studio once the externalUrl field redeploys.
 *
 * Run once: ./node_modules/.bin/tsx scripts/set-blog-image-hotspots.ts
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

type Hotspot = { x: number; y: number; width: number; height: number };

const mapping: { slug: string; hotspot: Hotspot }[] = [
  {
    // iskya-speaking.jpg — 2268x4032 portrait, face near top.
    slug: "cultura-seguridad-psicologica-chow-time-plurum",
    hotspot: { x: 0.5, y: 0.22, width: 0.5, height: 0.3 },
  },
  {
    // amcham-event.jpg — 1707x2560 portrait, face mid-frame.
    slug: "cultura-organizacional-fusiones-auna-colombia",
    hotspot: { x: 0.5, y: 0.55, width: 0.5, height: 0.3 },
  },
  {
    // team-workshop.jpg — 2560x1696 landscape, group activity — center works.
    slug: "cultura-alineada-con-estrategia",
    hotspot: { x: 0.5, y: 0.5, width: 0.6, height: 0.6 },
  },
];

async function main() {
  console.log(
    "Setting image hotspots in dataset:",
    process.env.NEXT_PUBLIC_SANITY_DATASET
  );

  for (const { slug, hotspot } of mapping) {
    const post = await client.fetch<
      { _id: string; mainImage?: { asset?: { _ref?: string } } } | null
    >(
      `*[_type == "post" && slug.current == $slug][0]{ _id, mainImage }`,
      { slug }
    );

    if (!post) {
      console.log(`  ⚠️  post "${slug}" not found — skipping`);
      continue;
    }

    if (!post.mainImage?.asset?._ref) {
      console.log(`  ⚠️  post "${slug}" has no mainImage — skipping`);
      continue;
    }

    await client
      .patch(post._id)
      .set({ "mainImage.hotspot": hotspot })
      .commit();

    console.log(
      `  ✅ ${slug} → hotspot (x:${hotspot.x}, y:${hotspot.y})`
    );
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
