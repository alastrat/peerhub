import { defineType, defineField } from "sanity";

export const heroSlide = defineType({
  name: "heroSlide",
  title: "Slide del Hero / Hero Slide",
  type: "document",
  icon: () => "🖼️",
  fields: [
    defineField({
      name: "title",
      title: "Título / Title",
      type: "localeString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtítulo / Subtitle",
      type: "localeText",
    }),
    defineField({
      name: "ctaText",
      title: "Texto del Botón / CTA Text",
      type: "localeString",
    }),
    defineField({
      name: "ctaUrl",
      title: "URL del Botón / CTA URL",
      type: "string",
      description: "URL relativa o absoluta (ej: /contacto o https://...)",
    }),
    defineField({
      name: "image",
      title: "Imagen de Fondo / Background Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative text",
        },
      ],
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
      title: "title.es",
      subtitle: "subtitle.es",
      media: "image",
      order: "order",
    },
    prepare({ title, subtitle, media, order }) {
      return {
        title: `${order ?? 0}. ${title || "Sin título"}`,
        subtitle: subtitle
          ? subtitle.length > 50
            ? `${subtitle.substring(0, 50)}...`
            : subtitle
          : "Sin subtítulo",
        media,
      };
    },
  },
  orderings: [
    {
      title: "Orden personalizado",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
});
