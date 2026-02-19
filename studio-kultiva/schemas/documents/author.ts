import { defineType, defineField } from "sanity";

export const author = defineType({
  name: "author",
  title: "Autor / Author",
  type: "document",
  icon: () => "✍️",
  fields: [
    defineField({
      name: "name",
      title: "Nombre / Name",
      type: "localeString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name.es",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Imagen / Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "bio",
      title: "Biografía / Bio",
      type: "localeText",
    }),
  ],
  preview: {
    select: {
      title: "name.es",
      subtitle: "name.en",
      media: "image",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || "Sin nombre",
        subtitle: subtitle ? `EN: ${subtitle}` : undefined,
        media,
      };
    },
  },
});
