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
// Validated Kultiva instrument (12 dimensions × 5 locked items, FREQ_4)
// ---------------------------------------------------------------------------

export async function seedClimateInstrument() {
  console.log("Seeding Kultiva climate instrument...");
  const {
    INSTRUMENT_DIMENSIONS,
    INSTRUMENT_TEMPLATE_NAME,
    INSTRUMENT_VERSION,
    instrumentItemConfig,
  } = await import("../src/lib/constants/climate-instrument");

  // Dimensions: match by code, else adopt a code-less system dimension with
  // the same name (e.g. the default "Liderazgo"), else create.
  const dimensionIds = new Map<string, string>();
  for (const [index, dim] of INSTRUMENT_DIMENSIONS.entries()) {
    const byCode = await prisma.climateDimension.findUnique({ where: { code: dim.code } });
    if (byCode) {
      dimensionIds.set(dim.code, byCode.id);
      continue;
    }
    const byName = await prisma.climateDimension.findFirst({
      where: { name: dim.name, companyId: null, code: null },
    });
    if (byName) {
      await prisma.climateDimension.update({ where: { id: byName.id }, data: { code: dim.code } });
      dimensionIds.set(dim.code, byName.id);
      console.log(`  🔗 Linked dimension "${dim.name}" → ${dim.code}`);
      continue;
    }
    const created = await prisma.climateDimension.create({
      data: {
        name: dim.name,
        description: dim.description,
        code: dim.code,
        companyId: null,
        isDefault: true,
        order: 100 + index,
      },
    });
    dimensionIds.set(dim.code, created.id);
    console.log(`  ✅ Created dimension "${dim.name}" (${dim.code})`);
  }

  const existing = await prisma.climateSurveyTemplate.findFirst({
    where: { companyId: null, instrumentVersion: INSTRUMENT_VERSION },
  });
  if (existing) {
    console.log(`  ⏭  Skipping "${INSTRUMENT_TEMPLATE_NAME}" (${INSTRUMENT_VERSION} already exists)`);
    return;
  }

  let order = 0;
  await prisma.climateSurveyTemplate.create({
    data: {
      name: INSTRUMENT_TEMPLATE_NAME,
      description:
        "Instrumento validado de Kultiva: 12 dimensiones × 5 ítems en escala de frecuencia de 4 puntos (Nunca, Casi nunca, Casi siempre, Siempre). Elige las dimensiones a aplicar; los ítems no se pueden editar.",
      type: "CLIMATE",
      companyId: null,
      isDefault: true,
      instrumentVersion: INSTRUMENT_VERSION,
      questions: {
        create: INSTRUMENT_DIMENSIONS.flatMap((dim) =>
          dim.items.map((item) => ({
            text: item.text,
            type: "LIKERT" as const,
            dimensionId: dimensionIds.get(dim.code)!,
            order: ++order,
            isRequired: true,
            config: instrumentItemConfig(item.code),
          })),
        ),
      },
    },
  });
  console.log(`  ✅ Created "${INSTRUMENT_TEMPLATE_NAME}" (${INSTRUMENT_VERSION}, ${order} items)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function seedSystemTemplates() {
  console.log("\n🌱 Seeding system templates...\n");
  await seed360Templates();
  console.log("");
  await seedClimateTemplates();
  console.log("");
  await seedClimateInstrument();
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
