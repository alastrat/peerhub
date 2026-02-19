import type { StructureBuilder } from "sanity/structure";

export const structure = (S: StructureBuilder) =>
  S.list()
    .title("Contenido / Content")
    .items([
      // Site Settings (singleton)
      S.listItem()
        .title("Configuración del Sitio / Site Settings")
        .icon(() => "⚙️")
        .child(
          S.document()
            .schemaType("siteSettings")
            .documentId("siteSettings")
            .title("Configuración del Sitio")
        ),

      S.divider(),

      // Blog section
      S.listItem()
        .title("Blog")
        .icon(() => "📝")
        .child(
          S.list()
            .title("Blog")
            .items([
              S.documentTypeListItem("post").title("Artículos / Posts"),
              S.documentTypeListItem("author").title("Autores / Authors"),
              S.documentTypeListItem("category").title("Categorías / Categories"),
            ])
        ),

      S.divider(),

      // Services
      S.documentTypeListItem("service")
        .title("Servicios / Services")
        .icon(() => "🛠️"),

      // FAQs
      S.documentTypeListItem("faq")
        .title("Preguntas Frecuentes / FAQs")
        .icon(() => "❓"),

      S.divider(),

      // Home page content
      S.listItem()
        .title("Página Principal / Home Page")
        .icon(() => "🏠")
        .child(
          S.list()
            .title("Contenido de la Página Principal")
            .items([
              S.documentTypeListItem("heroSlide")
                .title("Slides del Hero / Hero Slides"),
              S.documentTypeListItem("testimonial")
                .title("Testimonios / Testimonials"),
              S.documentTypeListItem("client")
                .title("Clientes / Clients"),
            ])
        ),

      // Team
      S.documentTypeListItem("teamMember")
        .title("Equipo / Team")
        .icon(() => "👥"),
    ]);
