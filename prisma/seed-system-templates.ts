/**
 * Seeds system-default templates for both 360 reviews and climate surveys.
 *
 * These templates have companyId=null and isDefault=true, making them
 * available to all companies as built-in templates.
 *
 * Run standalone:  npx tsx prisma/seed-system-templates.ts
 * Or via seed:     npx prisma db seed  (imported by seed.ts)
 */

import { PrismaClient } from "@prisma/client";
import { SYSTEM_360_TEMPLATES } from "./seeds/360-review-templates";
import { SYSTEM_CLIMATE_TEMPLATES } from "./seeds/climate-survey-templates";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// 360 Review Templates (Template → TemplateSection → TemplateQuestion)
// ---------------------------------------------------------------------------

async function seed360Templates() {
  console.log("Seeding 360 review templates...");

  for (const tmpl of SYSTEM_360_TEMPLATES) {
    const existing = await prisma.template.findFirst({
      where: { name: tmpl.name, companyId: null, isDefault: true },
    });

    if (existing) {
      console.log(`  ⏭  Skipping "${tmpl.name}" (already exists)`);
      continue;
    }

    await prisma.template.create({
      data: {
        name: tmpl.name,
        description: tmpl.description,
        companyId: null,
        isDefault: true,
        sections: {
          create: tmpl.sections.map((s) => ({
            title: s.title,
            description: s.description,
            order: s.order,
            reviewerTypes: s.reviewerTypes,
            questions: {
              create: s.questions.map((q) => ({
                text: q.text,
                description: q.description,
                type: q.type,
                isRequired: q.isRequired,
                order: q.order,
              })),
            },
          })),
        },
      },
    });

    const questionCount = tmpl.sections.reduce(
      (sum, s) => sum + s.questions.length,
      0
    );
    console.log(
      `  ✅ Created "${tmpl.name}" (${tmpl.sections.length} sections, ${questionCount} questions)`
    );
  }
}

// ---------------------------------------------------------------------------
// Climate Survey Templates (ClimateSurveyTemplate → ClimateSurveyTemplateQuestion)
// ---------------------------------------------------------------------------

async function seedClimateDimensions(): Promise<Map<string, string>> {
  // Ensure default dimensions exist and build a name→id map
  const { DEFAULT_DIMENSIONS } = await import(
    "../src/lib/constants/climate-survey"
  );

  const dimensionMap = new Map<string, string>();

  for (const dim of DEFAULT_DIMENSIONS) {
    const existing = await prisma.climateDimension.findFirst({
      where: { name: dim.name, companyId: null, isDefault: true },
    });

    if (existing) {
      dimensionMap.set(dim.name, existing.id);
    } else {
      const created = await prisma.climateDimension.create({
        data: {
          name: dim.name,
          description: dim.description,
          icon: dim.icon,
          companyId: null,
          isDefault: true,
          order: DEFAULT_DIMENSIONS.indexOf(dim),
        },
      });
      dimensionMap.set(dim.name, created.id);
      console.log(`  ✅ Created dimension "${dim.name}"`);
    }
  }

  return dimensionMap;
}

async function seedClimateTemplates() {
  console.log("Seeding climate survey templates...");

  const dimensionMap = await seedClimateDimensions();

  for (const tmpl of SYSTEM_CLIMATE_TEMPLATES) {
    const existing = await prisma.climateSurveyTemplate.findFirst({
      where: { name: tmpl.name, companyId: null, isDefault: true },
    });

    if (existing) {
      console.log(`  ⏭  Skipping "${tmpl.name}" (already exists)`);
      continue;
    }

    await prisma.climateSurveyTemplate.create({
      data: {
        name: tmpl.name,
        description: tmpl.description,
        type: tmpl.type,
        companyId: null,
        isDefault: true,
        questions: {
          create: tmpl.questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionName
              ? dimensionMap.get(q.dimensionName) ?? null
              : null,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config ?? undefined,
          })),
        },
      },
    });

    console.log(
      `  ✅ Created "${tmpl.name}" (${tmpl.type}, ${tmpl.questions.length} questions)`
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function seedSystemTemplates() {
  console.log("\n🌱 Seeding system templates...\n");
  await seed360Templates();
  console.log("");
  await seedClimateTemplates();
  console.log("\n✅ System templates seeded successfully!\n");
}

// Allow running standalone
if (require.main === module) {
  seedSystemTemplates()
    .catch((e) => {
      console.error("Seed failed:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
