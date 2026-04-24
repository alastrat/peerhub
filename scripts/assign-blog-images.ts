/**
 * Upload images from /public and assign them as mainImage on the 3 blog posts
 * created in apply-web-feedback-2026-04-22.ts.
 *
 * Run once: ./node_modules/.bin/tsx scripts/assign-blog-images.ts
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { resolve, basename } from "node:path";

loadEnv({ path: ".env.local" });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const PUBLIC_DIR = resolve(process.cwd(), "public");

const mapping: { slug: string; file: string }[] = [
  {
    slug: "cultura-alineada-con-estrategia",
    file: "images/team/team-workshop.jpg",
  },
  {
    slug: "cultura-organizacional-fusiones-auna-colombia",
    file: "images/team/amcham-event.jpg",
  },
  {
    slug: "cultura-seguridad-psicologica-chow-time-plurum",
    file: "images/team/iskya-speaking.jpg",
  },
];

async function uploadImage(relativePath: string) {
  const fullPath = resolve(PUBLIC_DIR, relativePath);
  const buffer = readFileSync(fullPath);
  const filename = basename(fullPath);

  const asset = await client.assets.upload("image", buffer, { filename });
  return asset._id;
}

async function main() {
  console.log(
    "Uploading blog post images to dataset:",
    process.env.NEXT_PUBLIC_SANITY_DATASET
  );

  for (const { slug, file } of mapping) {
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

    if (post.mainImage?.asset?._ref) {
      console.log(
        `  ⏭  "${slug}" already has mainImage (${post.mainImage.asset._ref}) — skipping`
      );
      continue;
    }

    console.log(`  ↑ uploading ${file} for "${slug}"`);
    const assetId = await uploadImage(file);

    await client
      .patch(post._id)
      .set({
        mainImage: {
          _type: "image",
          asset: { _type: "reference", _ref: assetId },
        },
      })
      .commit();

    console.log(`  ✅ attached ${assetId} to ${post._id}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
