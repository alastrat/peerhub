import { defineType } from "sanity";

export const localeText = defineType({
  name: "localeText",
  title: "Localized Text",
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
      type: "text",
      rows: 4,
      fieldset: "translations",
    },
    {
      name: "en",
      title: "English",
      type: "text",
      rows: 4,
      fieldset: "translations",
    },
  ],
  preview: {
    select: {
      es: "es",
      en: "en",
    },
    prepare({ es, en }) {
      const preview = es || en || "Sin traducción";
      return {
        title: preview.length > 50 ? `${preview.substring(0, 50)}...` : preview,
        subtitle: es && en ? "✓ ES | ✓ EN" : es ? "✓ ES | ✗ EN" : en ? "✗ ES | ✓ EN" : "Sin traducciones",
      };
    },
  },
});
