/**
 * Update team member bios from the Canva services deck (slide 10).
 * Idempotent — matches by name.
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

interface BioPatch {
  nameMatch: string;
  role: { es: string; en: string };
  bio: { es: string; en: string };
}

const patches: BioPatch[] = [
  {
    nameMatch: "Iskya",
    role: { es: "Directora de Proyectos", en: "Director of Projects" },
    bio: {
      es: "Maestra en desarrollo organizacional y cambio de la Universidad de Monterrey, México. Especialista en Gerencia de Gestión del Talento Humano, con certificación en Change Management Practitioner (CMP) del Instituto Europeo de Posgrados. Certified Change Management Practitioner certificada por Change Américas Colombia. 20 años de experiencia en desarrollo organizacional.",
      en: "Master in organizational development and change from Universidad de Monterrey, Mexico. Specialist in Human Talent Management, certified Change Management Practitioner (CMP) from the European Institute of Postgraduate Studies. Certified Change Management Practitioner by Change Américas Colombia. 20 years of experience in organizational development.",
    },
  },
  {
    nameMatch: "Laura",
    role: { es: "Directora de Operaciones", en: "Director of Operations" },
    bio: {
      es: "Ingeniera Industrial con +5 años liderando operaciones, transformación organizacional y crecimiento en entornos tecnológicos y consultivos en LATAM. Experta en transformación digital con IA, automatización de procesos, estrategia operativa y gestión del cambio, conectando visión ejecutiva con ejecución. Experiencia en SaaS B2B, sector público y consultoría estratégica, liderando proyectos de impacto nacional y equipos multidisciplinarios.",
      en: "Industrial Engineer with 5+ years leading operations, organizational transformation and growth across technology and consulting environments in LATAM. Expert in AI-powered digital transformation, process automation, operational strategy and change management, connecting executive vision with execution. Experience in B2B SaaS, public sector and strategic consulting, leading projects of national impact and multidisciplinary teams.",
    },
  },
  {
    nameMatch: "Regina",
    role: { es: "Directora de Investigación", en: "Director of Research" },
    bio: {
      es: "Psicóloga, Magíster, Especialista en psicología económica y del consumo, PhD en psicología, con profesionalización en psicología cultural empresarial y social. +20 años de experiencia en Barranquilla en procesos universitarios, formación, asesoría, consultoría, selección de personal, intervención psicosocial, investigación científica, organizacional y de mercadeo. Mi propósito es contribuir a la formación de instituciones, equipos de trabajo y personas mediante servicios de alta calidad que generen impacto e innovación, a partir de la investigación científica.",
      en: "Psychologist with a Master's and Specialization in economic and consumer psychology, PhD in psychology, with advanced training in cultural, business and social psychology. 20+ years of experience in Barranquilla across university programs, training, advisory, consulting, personnel selection, psychosocial intervention, scientific research, and organizational and market studies. My purpose is to contribute to the development of institutions, teams and individuals through high-quality services that generate impact and innovation, grounded in scientific research.",
    },
  },
];

async function main() {
  console.log("Updating team member bios in dataset:", process.env.NEXT_PUBLIC_SANITY_DATASET);

  for (const patch of patches) {
    const doc = await client.fetch<{ _id: string; name?: unknown } | null>(
      `*[_type == "teamMember" && (
        name match $q || name.es match $q
      )][0]`,
      { q: `*${patch.nameMatch}*` }
    );

    if (!doc) {
      console.log(`  ⚠️  no team member matching "${patch.nameMatch}" — skipping`);
      continue;
    }

    await client
      .patch(doc._id)
      .set({
        role: patch.role,
        bio: patch.bio,
      })
      .commit();

    console.log(`  ✅ updated "${patch.nameMatch}" (id: ${doc._id})`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
