import { defineType, defineField } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Configuración del Sitio / Site Settings",
  type: "document",
  icon: () => "⚙️",
  fields: [
    defineField({
      name: "siteName",
      title: "Nombre del Sitio / Site Name",
      type: "localeString",
    }),
    defineField({
      name: "siteDescription",
      title: "Descripción del Sitio / Site Description",
      type: "localeText",
      description: "Meta descripción para SEO",
    }),
    defineField({
      name: "contactInfo",
      title: "Información de Contacto / Contact Info",
      type: "object",
      fields: [
        {
          name: "address",
          title: "Dirección / Address",
          type: "text",
          rows: 2,
        },
        {
          name: "phone",
          title: "Teléfono / Phone",
          type: "string",
        },
        {
          name: "email",
          title: "Email",
          type: "email",
        },
        {
          name: "hours",
          title: "Horario de Atención / Business Hours",
          type: "localeString",
        },
      ],
    }),
    defineField({
      name: "socialLinks",
      title: "Redes Sociales / Social Links",
      type: "object",
      fields: [
        {
          name: "facebook",
          title: "Facebook",
          type: "url",
        },
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
          name: "instagram",
          title: "Instagram",
          type: "url",
        },
        {
          name: "youtube",
          title: "YouTube",
          type: "url",
        },
      ],
    }),
    defineField({
      name: "footerText",
      title: "Texto del Footer / Footer Text",
      type: "localeText",
      description: "Texto adicional que aparece en el footer",
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Configuración del Sitio",
        subtitle: "Ajustes generales del sitio web",
      };
    },
  },
});
