import { defineType, defineField } from "sanity";

export const post = defineType({
  name: "post",
  title: "Artículo / Post",
  type: "document",
  icon: () => "📝",
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
      name: "mainImage",
      title: "Imagen Principal / Main Image",
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
      name: "excerpt",
      title: "Extracto / Excerpt",
      type: "localeText",
      description: "Breve descripción del artículo para previsualizaciones",
    }),
    defineField({
      name: "body",
      title: "Contenido / Body",
      type: "localeBlockContent",
    }),
    defineField({
      name: "author",
      title: "Autor / Author",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "categories",
      title: "Categorías / Categories",
      type: "array",
      of: [{ type: "reference", to: { type: "category" } }],
    }),
    defineField({
      name: "publishedAt",
      title: "Fecha de Publicación / Published At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: "title.es",
      author: "author.name.es",
      media: "mainImage",
      publishedAt: "publishedAt",
    },
    prepare({ title, author, media, publishedAt }) {
      const date = publishedAt
        ? new Date(publishedAt).toLocaleDateString("es-ES")
        : "Sin fecha";
      return {
        title: title || "Sin título",
        subtitle: `${author || "Sin autor"} • ${date}`,
        media,
      };
    },
  },
  orderings: [
    {
      title: "Fecha de publicación (más reciente)",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
    {
      title: "Fecha de publicación (más antiguo)",
      name: "publishedAtAsc",
      by: [{ field: "publishedAt", direction: "asc" }],
    },
    {
      title: "Título A-Z",
      name: "titleAsc",
      by: [{ field: "title.es", direction: "asc" }],
    },
  ],
});
