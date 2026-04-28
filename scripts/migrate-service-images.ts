/**
 * Uploads current /public service hero + secondary images to Sanity and patches
 * each `service` document so it has `image` and `secondaryImage` set. After
 * this runs, the team can swap photos directly from Sanity Studio.
 *
 * Idempotent: skips upload if the field already references an asset.
 *
 * Run once:  ./node_modules/.bin/tsx scripts/migrate-service-images.ts
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

const mapping: {
  slug: string;
  image: string;
  secondaryImage: string;
}[] = [
  {
    slug: "transformacion-cultural",
    image: "images/team/team-workshop.jpg",
    secondaryImage: "images/team/conference-1.jpg",
  },
  {
    slug: "seleccion-especializada",
    image: "images/others/personas-seleccion.webp",
    secondaryImage: "images/others/seleccion2.jpg",
  },
  {
    slug: "liderazgo",
    image: "images/others/iskya-liderazgo.jpeg",
    secondaryImage: "images/team/conference-1.jpg",
  },
];

async function uploadAsset(relativePath: string) {
  const fullPath = resolve(PUBLIC_DIR, relativePath);
  const buffer = readFileSync(fullPath);
  const filename = basename(fullPath);
  const asset = await client.assets.upload("image", buffer, { filename });
  return asset._id;
}

async function main() {
  console.log(
    "Migrating service images in dataset:",
    process.env.NEXT_PUBLIC_SANITY_DATASET
  );

  for (const { slug, image, secondaryImage } of mapping) {
    const service = await client.fetch<
      {
        _id: string;
        image?: { asset?: { _ref?: string } };
        secondaryImage?: { asset?: { _ref?: string } };
      } | null
    >(
      `*[_type == "service" && slug.current == $slug][0]{ _id, image, secondaryImage }`,
      { slug }
    );

    if (!service) {
      console.log(`  ⚠️  service "${slug}" not found in Sanity — skipping`);
      continue;
    }

    const patch: Record<string, unknown> = {};

    if (!service.image?.asset?._ref) {
      console.log(`  ↑ uploading hero image for "${slug}" (${image})`);
      const assetId = await uploadAsset(image);
      patch.image = {
        _type: "image",
        asset: { _type: "reference", _ref: assetId },
      };
    } else {
      console.log(`  ⏭  hero image already set for "${slug}"`);
    }

    if (!service.secondaryImage?.asset?._ref) {
      console.log(
        `  ↑ uploading secondary image for "${slug}" (${secondaryImage})`
      );
      const assetId = await uploadAsset(secondaryImage);
      patch.secondaryImage = {
        _type: "image",
        asset: { _type: "reference", _ref: assetId },
      };
    } else {
      console.log(`  ⏭  secondary image already set for "${slug}"`);
    }

    if (Object.keys(patch).length > 0) {
      await client.patch(service._id).set(patch).commit();
      console.log(`  ✅ patched ${service._id}`);
    }
  }

  console.log("\nDone. Open Sanity Studio to verify:");
  console.log("  https://kultiva.sanity.studio/structure/service");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
