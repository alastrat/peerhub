import { defineType, defineField } from "sanity";

export const testimonial = defineType({
  name: "testimonial",
  title: "Testimonio / Testimonial",
  type: "document",
  icon: () => "💬",
  fields: [
    defineField({
      name: "name",
      title: "Nombre / Name",
      type: "localeString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "role",
      title: "Cargo / Role",
      type: "localeString",
    }),
    defineField({
      name: "company",
      title: "Empresa / Company",
      type: "string",
    }),
    defineField({
      name: "quote",
      title: "Testimonio / Quote",
      type: "localeText",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Foto / Photo",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "rating",
      title: "Calificación / Rating",
      type: "number",
      description: "Calificación de 1 a 5 estrellas",
      validation: (Rule) => Rule.min(1).max(5).integer(),
      initialValue: 5,
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
      company: "company",
      media: "image",
      rating: "rating",
    },
    prepare({ title, company, media, rating }) {
      const stars = "⭐".repeat(rating || 0);
      return {
        title: title || "Sin nombre",
        subtitle: `${company || "Sin empresa"} ${stars}`,
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
