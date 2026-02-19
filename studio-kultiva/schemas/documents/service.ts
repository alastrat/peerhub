import { defineType, defineField, defineArrayMember } from "sanity";

export const service = defineType({
  name: "service",
  title: "Servicio / Service",
  type: "document",
  icon: () => "🛠️",
  fields: [
    defineField({
      name: "title",
      title: "Título / Title",
      type: "localeString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title.es",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "icon",
      title: "Icono / Icon",
      type: "string",
      description: "Nombre del icono de Font Awesome (ej: flaticon-recommend)",
    }),
    defineField({
      name: "shortDescription",
      title: "Descripción Corta / Short Description",
      type: "localeText",
      description: "Descripción breve para las tarjetas de servicio",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "fullDescription",
      title: "Descripción Completa / Full Description",
      type: "localeBlockContent",
      description: "Descripción detallada para la página del servicio",
    }),
    defineField({
      name: "image",
      title: "Imagen / Image",
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
      name: "benefits",
      title: "Beneficios / Benefits",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "benefit",
          title: "Beneficio",
          fields: [
            {
              name: "title",
              title: "Título / Title",
              type: "localeString",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "description",
              title: "Descripción / Description",
              type: "localeText",
            },
          ],
          preview: {
            select: {
              title: "title.es",
            },
            prepare({ title }) {
              return {
                title: title || "Sin título",
              };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "faqs",
      title: "Preguntas Frecuentes / FAQs",
      type: "array",
      description: "FAQs específicas de este servicio",
      of: [
        defineArrayMember({
          type: "object",
          name: "serviceFaq",
          title: "FAQ",
          fields: [
            {
              name: "question",
              title: "Pregunta / Question",
              type: "localeString",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "answer",
              title: "Respuesta / Answer",
              type: "localeText",
              validation: (Rule) => Rule.required(),
            },
          ],
          preview: {
            select: {
              title: "question.es",
            },
            prepare({ title }) {
              return {
                title: title || "Sin pregunta",
              };
            },
          },
        }),
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
      subtitle: "shortDescription.es",
      media: "image",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || "Sin título",
        subtitle: subtitle
          ? subtitle.length > 50
            ? `${subtitle.substring(0, 50)}...`
            : subtitle
          : "Sin descripción",
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
      title: "Título A-Z",
      name: "titleAsc",
      by: [{ field: "title.es", direction: "asc" }],
    },
  ],
});
