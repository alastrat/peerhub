import { defineType } from "sanity";

export const localeString = defineType({
  name: "localeString",
  title: "Localized String",
  type: "object",
  fieldsets: [
    {
      name: "translations",
      title: "Traducciones / Translations",
      options: { collapsible: true, collapsed: false },
    },
  ],
  fields: [
    {
      name: "es",
      title: "Español",
      type: "string",
      fieldset: "translations",
    },
    {
      name: "en",
      title: "English",
      type: "string",
      fieldset: "translations",
    },
  ],
  preview: {
    select: {
      es: "es",
      en: "en",
    },
    prepare({ es, en }) {
      return {
        title: es || en || "Sin traducción",
        subtitle: es && en ? "✓ ES | ✓ EN" : es ? "✓ ES | ✗ EN" : en ? "✗ ES | ✓ EN" : "Sin traducciones",
      };
    },
  },
});
