import { defineType, defineField } from "sanity";

export const client = defineType({
  name: "client",
  title: "Cliente / Client",
  type: "document",
  icon: () => "🏢",
  fields: [
    defineField({
      name: "name",
      title: "Nombre / Name",
      type: "localeString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative text",
        },
      ],
    }),
    defineField({
      name: "url",
      title: "Sitio Web / Website",
      type: "url",
      description: "URL del sitio web del cliente (opcional)",
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
      title: "name.es",
      url: "url",
      media: "logo",
    },
    prepare({ title, url, media }) {
      return {
        title: title || "Sin nombre",
        subtitle: url || "Sin URL",
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
    {
      title: "Nombre A-Z",
      name: "nameAsc",
      by: [{ field: "name.es", direction: "asc" }],
    },
  ],
});
