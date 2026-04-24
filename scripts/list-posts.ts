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

async function main() {
  const posts = await client.fetch(
    `*[_type == "post"]{ _id, "slug": slug.current, "title": title.es, publishedAt, externalUrl } | order(publishedAt desc)`
  );
  console.log(JSON.stringify(posts, null, 2));
}
main();
