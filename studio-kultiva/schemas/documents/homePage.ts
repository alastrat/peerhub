import { defineType, defineField } from "sanity";

/**
 * Singleton document for editable copy on the public home page.
 * Each section adds its own group of fields here over time.
 */
export const homePage = defineType({
  name: "homePage",
  title: "Página Principal / Home Page",
  type: "document",
  icon: () => "🏠",
  groups: [
    {
      name: "services",
      title: "Sección de Servicios",
      default: true,
    },
  ],
  fields: [
    defineField({
      name: "servicesSubtitle",
      title: "Servicios — Subtítulo / Eyebrow",
      description:
        "Texto pequeño que aparece sobre el título (ej: NUESTROS SERVICIOS).",
      type: "localeString",
      group: "services",
    }),
    defineField({
      name: "servicesTitle",
      title: "Servicios — Título / Heading",
      description:
        "Título principal de la sección de servicios en la página de inicio.",
      type: "localeString",
      group: "services",
    }),
    defineField({
      name: "servicesDescription",
      title: "Servicios — Descripción / Footer line",
      description:
        "Línea que aparece debajo de las tarjetas, junto al enlace 'Ver todos los servicios'.",
      type: "localeText",
      group: "services",
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Página Principal",
        subtitle: "Contenido editable de la home",
      };
    },
  },
});
