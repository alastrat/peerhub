import { defineType, defineField } from "sanity";

export const category = defineType({
  name: "category",
  title: "Categoría / Category",
  type: "document",
  icon: () => "📁",
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
      name: "description",
      title: "Descripción / Description",
      type: "localeText",
    }),
  ],
  preview: {
    select: {
      title: "name.es",
      subtitle: "name.en",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "Sin nombre",
        subtitle: subtitle ? `EN: ${subtitle}` : undefined,
      };
    },
  },
});
