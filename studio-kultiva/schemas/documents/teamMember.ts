import { defineType, defineField } from "sanity";

export const teamMember = defineType({
  name: "teamMember",
  title: "Miembro del Equipo / Team Member",
  type: "document",
  icon: () => "👤",
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "bio",
      title: "Biografía / Bio",
      type: "localeText",
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
      name: "socialLinks",
      title: "Redes Sociales / Social Links",
      type: "object",
      fields: [
        {
          name: "twitter",
          title: "Twitter/X",
          type: "url",
        },
        {
          name: "linkedin",
          title: "LinkedIn",
          type: "url",
        },
        {
          name: "email",
          title: "Email",
          type: "email",
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
      title: "name.es",
      role: "role.es",
      media: "image",
    },
    prepare({ title, role, media }) {
      return {
        title: title || "Sin nombre",
        subtitle: role || "Sin cargo",
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
