import { defineType } from "sanity";

export const localeBlockContent = defineType({
  name: "localeBlockContent",
  title: "Localized Block Content",
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
      type: "blockContent",
      fieldset: "translations",
    },
    {
      name: "en",
      title: "English",
      type: "blockContent",
      fieldset: "translations",
    },
  ],
});
