import { defineType, defineField } from "sanity";

export const faq = defineType({
  name: "faq",
  title: "Pregunta Frecuente / FAQ",
  type: "document",
  icon: () => "❓",
  fields: [
    defineField({
      name: "question",
      title: "Pregunta / Question",
      type: "localeString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "answer",
      title: "Respuesta / Answer",
      type: "localeText",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Categoría / Category",
      type: "string",
      description: "Categoría para agrupar preguntas relacionadas",
      options: {
        list: [
          { title: "General", value: "general" },
          { title: "Servicios / Services", value: "services" },
          { title: "Precios / Pricing", value: "pricing" },
          { title: "Proceso / Process", value: "process" },
          { title: "Soporte / Support", value: "support" },
        ],
      },
      initialValue: "general",
    }),
    defineField({
      name: "order",
      title: "Orden / Order",
      type: "number",
      description: "Orden de aparición (menor número = primero)",
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: "question.es",
      category: "category",
    },
    prepare({ title, category }) {
      const categoryLabels: Record<string, string> = {
        general: "General",
        services: "Servicios",
        pricing: "Precios",
        process: "Proceso",
        support: "Soporte",
      };
      return {
        title: title || "Sin pregunta",
        subtitle: categoryLabels[category] || category,
      };
    },
  },
  orderings: [
    {
      title: "Orden personalizado",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
    {
      title: "Categoría",
      name: "categoryAsc",
      by: [
        { field: "category", direction: "asc" },
        { field: "order", direction: "asc" },
      ],
    },
  ],
});
