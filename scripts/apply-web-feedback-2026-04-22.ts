/**
 * Apply the Kultiva website feedback from 22-abril-2026.
 *
 * This script:
 *   - Renames the 3 home-page services (items 3-5)
 *   - Deletes the Narly Herrera testimonial (items 8, 17)
 *   - Creates 3 new blog posts (item 9)
 *
 * Run once:   ./node_modules/.bin/tsx scripts/apply-web-feedback-2026-04-22.ts
 *
 * Uses SANITY_API_TOKEN from .env.local (needs write permission).
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

async function renameServices() {
  console.log("\n— Renaming services —");

  type Patch = {
    currentEsTitle: string;
    title: { es: string; en: string };
    shortDescription: { es: string; en: string };
  };

  const patches: Patch[] = [
    {
      currentEsTitle: "Cultura Organizacional",
      title: {
        es: "Diseño y Transformación cultural",
        en: "Cultural Design and Transformation",
      },
      shortDescription: {
        es: "Convertimos la cultura organizacional en una palanca real de cambio, desempeño y coherencia estratégica.",
        en: "We turn organizational culture into a real lever for change, performance and strategic coherence.",
      },
    },
    {
      currentEsTitle: "Gestión del Cambio",
      title: {
        es: "Diagnóstico de Clima",
        en: "Climate Diagnostic",
      },
      shortDescription: {
        es: "Medimos de forma estructurada la percepción de los colaboradores sobre su entorno de trabajo, el liderazgo y la cultura organizacional.",
        en: "We measure employees' perception of their work environment, leadership and culture through a structured diagnostic.",
      },
    },
    {
      currentEsTitle: "Comunicación Interna",
      title: {
        es: "Desarrollo de liderazgo estratégico",
        en: "Strategic Leadership Development",
      },
      shortDescription: {
        es: "Diseñamos formación orientada a fortalecer las competencias de liderazgo en las organizaciones, mediante el desarrollo de habilidades clave.",
        en: "We design training programs that strengthen leadership competencies across the organization through the development of key skills.",
      },
    },
  ];

  for (const patch of patches) {
    // Match current service by the existing Spanish title (also tolerate missing accents)
    const query = `*[_type == "service" && (title.es == $exact || title.es == $noAccent)][0]`;
    const noAccent = patch.currentEsTitle
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    const service = await client.fetch(query, {
      exact: patch.currentEsTitle,
      noAccent,
    });

    if (!service) {
      console.log(`  ⚠️  service "${patch.currentEsTitle}" not found — skipping`);
      continue;
    }

    await client
      .patch(service._id)
      .set({
        title: patch.title,
        shortDescription: patch.shortDescription,
      })
      .commit();

    console.log(
      `  ✅ "${patch.currentEsTitle}" → "${patch.title.es}" (id: ${service._id})`
    );
  }
}

async function deleteNarlyTestimonial() {
  console.log("\n— Removing Narly Herrera testimonial —");

  // testimonial schema has `author.name` as a localeString or similar. We'll match
  // by any field that contains "Narly" so we catch schema variations.
  const matches = await client.fetch<
    Array<{ _id: string; name?: { es?: string } | string; author?: { name?: { es?: string } | string } }>
  >(
    `*[_type == "testimonial" && (
      name match "*Narly*" ||
      name.es match "*Narly*" ||
      author.name match "*Narly*" ||
      author.name.es match "*Narly*" ||
      content match "*Narly*" ||
      content.es match "*Narly*"
    )]`
  );

  if (matches.length === 0) {
    console.log("  ⚠️  no Narly Herrera testimonial found");
    return;
  }

  for (const doc of matches) {
    await client.delete(doc._id);
    console.log(`  ✅ deleted testimonial ${doc._id}`);
  }
}

async function createBlogPosts() {
  console.log("\n— Creating 3 new blog posts —");

  // We create posts with excerpt + a single-paragraph body that references the original
  // source. The team can enrich body content later in Studio.
  const posts = [
    {
      slug: "cultura-organizacional-fusiones-auna-colombia",
      title: {
        es: "El papel de la cultura organizacional en fusiones de negocios",
        en: "The role of organizational culture in business mergers",
      },
      excerpt: {
        es: "Iskya Boom comparte cómo la cultura organizacional define el éxito o el fracaso de las fusiones, a partir de su experiencia con Auna Colombia.",
        en: "Iskya Boom shares how organizational culture defines the success or failure of business mergers, drawing on her experience with Auna Colombia.",
      },
      externalUrl:
        "https://www.linkedin.com/pulse/el-papel-de-la-cultura-organizacional-en-fusiones-boom/",
      body: {
        es: "En un mercado donde las fusiones y adquisiciones son cada vez más frecuentes, la cultura organizacional deja de ser un \"soft topic\" para convertirse en el factor que determina si la integración genera valor o destruye talento. Iskya Boom, fundadora de Kultiva, comparte aprendizajes de su trabajo con Auna Colombia sobre cómo diagnosticar, alinear e integrar culturas en procesos de fusión. El artículo completo fue publicado originalmente en LinkedIn.",
        en: "In a market where mergers and acquisitions are increasingly frequent, organizational culture is no longer a \"soft topic\" — it becomes the factor that determines whether integration creates value or destroys talent. Iskya Boom, founder of Kultiva, shares lessons from her work with Auna Colombia on how to diagnose, align and integrate cultures through mergers. The full article was originally published on LinkedIn.",
      },
    },
    {
      slug: "cultura-seguridad-psicologica-chow-time-plurum",
      title: {
        es: "Cultura y seguridad psicológica — CHOw Time en el podcast de :plurum",
        en: "Culture and psychological safety — CHOw Time on the :plurum podcast",
      },
      excerpt: {
        es: "Iskya Boom conversa sobre cómo construir entornos de trabajo psicológicamente seguros y por qué son el cimiento de la innovación.",
        en: "Iskya Boom discusses how to build psychologically safe workplaces and why they are the foundation of innovation.",
      },
      externalUrl:
        "https://open.spotify.com/episode/?utm_source=kultiva-website",
      body: {
        es: "En el episodio 09 del podcast :plurum (\"CHOw Time\"), Iskya Boom conversa sobre cultura organizacional y seguridad psicológica. Habla de las señales que delatan culturas tóxicas, los hábitos de liderazgo que construyen confianza y por qué la seguridad psicológica es condición necesaria para la innovación. Escucha el episodio completo en Spotify.",
        en: "In episode 09 of the :plurum podcast (\"CHOw Time\"), Iskya Boom discusses organizational culture and psychological safety. She covers the signals of toxic cultures, the leadership habits that build trust and why psychological safety is a prerequisite for innovation. Listen to the full episode on Spotify.",
      },
    },
    {
      slug: "cultura-alineada-con-estrategia",
      title: {
        es: "¿Qué tan alineada está tu cultura con la estrategia?",
        en: "How aligned is your culture with your strategy?",
      },
      excerpt: {
        es: "Una cultura que contradice la estrategia la derrota antes de empezar. Señales, preguntas y prácticas para medir (y cerrar) la brecha.",
        en: "A culture that contradicts strategy defeats it before it starts. Signals, questions and practices to measure (and close) the gap.",
      },
      externalUrl:
        "https://www.linkedin.com/pulse/qu%C3%A9-tan-alineada-est%C3%A1-tu-cultura-con-la-estrategia-iskya-boom/",
      body: {
        es: "Peter Drucker decía que la cultura se come a la estrategia para desayunar, y sigue siendo cierto. Pero la pregunta práctica es: ¿cómo saber si nuestra cultura sostiene o contradice nuestra estrategia? En este artículo Iskya Boom propone un marco sencillo con cuatro señales de desalineación, tres preguntas que los equipos directivos deberían hacerse en la planeación estratégica y prácticas concretas para ir cerrando la brecha. El artículo completo está en LinkedIn.",
        en: "Peter Drucker said culture eats strategy for breakfast — and it still does. But the practical question is: how do we know if our culture supports or contradicts our strategy? In this article, Iskya Boom proposes a simple framework with four signals of misalignment, three questions leadership teams should ask during strategic planning, and concrete practices to start closing the gap. Read the full article on LinkedIn.",
      },
    },
  ];

  for (const post of posts) {
    const existing = await client.fetch<{ _id: string } | null>(
      `*[_type == "post" && slug.current == $slug][0]`,
      { slug: post.slug }
    );

    if (existing) {
      console.log(`  ⏭  post "${post.slug}" already exists (${existing._id}) — skipping`);
      continue;
    }

    // Convert body text into localeBlockContent (portable text) for each locale
    const bodyToBlocks = (text: string) => [
      {
        _type: "block",
        _key: Math.random().toString(36).slice(2, 10),
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: Math.random().toString(36).slice(2, 10),
            text,
            marks: [],
          },
        ],
      },
    ];

    await client.create({
      _type: "post",
      title: post.title,
      slug: { _type: "slug", current: post.slug },
      excerpt: post.excerpt,
      body: {
        es: bodyToBlocks(post.body.es),
        en: bodyToBlocks(post.body.en),
      },
      publishedAt: new Date().toISOString(),
    });

    console.log(`  ✅ created post "${post.title.es}"`);
  }
}

async function main() {
  console.log("Applying web feedback to Sanity dataset:", process.env.NEXT_PUBLIC_SANITY_DATASET);

  await renameServices();
  await deleteNarlyTestimonial();
  await createBlogPosts();

  console.log("\nDone. Verify in Sanity Studio: https://kultiva.sanity.studio/");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
