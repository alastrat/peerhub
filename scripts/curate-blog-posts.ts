/**
 * Keeps only the 3 desired blog posts in Sanity and updates their externalUrl
 * + publishedAt so they render in the order the team asked for (newest first).
 *
 * Run once: ./node_modules/.bin/tsx scripts/curate-blog-posts.ts
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

// Order reflects the display order requested (newest publishedAt first).
const keep: {
  slug: string;
  externalUrl: string;
  publishedAt: string;
}[] = [
  {
    slug: "cultura-alineada-con-estrategia",
    externalUrl:
      "https://www.linkedin.com/pulse/qu%C3%A9-tan-alineada-esta-tu-cultura-con-la-estrategia-iskya-boom-silva/?trackingId=X4vrAZH5QV2i15Q0Cy9ozQ%3D%3D",
    publishedAt: "2026-04-24T03:00:00.000Z",
  },
  {
    slug: "cultura-seguridad-psicologica-chow-time-plurum",
    externalUrl: "https://open.spotify.com/episode/2u2aNWEKt3i5EFS3youYcS",
    publishedAt: "2026-04-24T02:00:00.000Z",
  },
  {
    slug: "cultura-organizacional-fusiones-auna-colombia",
    externalUrl:
      "https://www.crehana.com/blog/expertos-hr/cultura-organizacional-integracion-fusiones-negocios/#CulturaOrganizacional",
    publishedAt: "2026-04-24T01:00:00.000Z",
  },
];

async function main() {
  console.log(
    "Curating posts in dataset:",
    process.env.NEXT_PUBLIC_SANITY_DATASET
  );

  const keepSlugs = keep.map((k) => k.slug);

  console.log("\n— Updating posts to keep —");
  for (const { slug, externalUrl, publishedAt } of keep) {
    const post = await client.fetch<{ _id: string } | null>(
      `*[_type == "post" && slug.current == $slug][0]{ _id }`,
      { slug }
    );

    if (!post) {
      console.log(`  ⚠️  post "${slug}" not found — skipping`);
      continue;
    }

    await client.patch(post._id).set({ externalUrl, publishedAt }).commit();
    console.log(`  ✅ ${slug}`);
  }

  console.log("\n— Deleting other posts —");
  const others = await client.fetch<{ _id: string; slug: string }[]>(
    `*[_type == "post" && !(slug.current in $keepSlugs)]{ _id, "slug": slug.current }`,
    { keepSlugs }
  );

  if (others.length === 0) {
    console.log("  (nothing to delete)");
  } else {
    for (const o of others) {
      await client.delete(o._id);
      console.log(`  🗑  deleted ${o.slug}`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
