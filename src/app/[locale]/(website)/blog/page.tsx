import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/kultiva/layout";
import { SectionTitle } from "@/components/kultiva/ui";
import { BlogCard } from "@/components/kultiva/ui/Card";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";

// Placeholder posts - will be replaced with Sanity CMS data
const posts = [
  {
    id: 1,
    image: "/kultiva/images/blog/post1.jpg",
    category: "Cultura",
    title: "5 claves para construir una cultura organizacional solida",
    excerpt:
      "Descubre las estrategias fundamentales para desarrollar una cultura que impulse el compromiso y los resultados.",
    date: "15 Ene 2026",
    slug: "5-claves-cultura-organizacional",
  },
  {
    id: 2,
    image: "/kultiva/images/blog/post2.jpg",
    category: "Liderazgo",
    title: "El rol del lider en la transformacion digital",
    excerpt:
      "Como los lideres pueden guiar a sus equipos a traves del cambio tecnologico manteniendo el enfoque en las personas.",
    date: "10 Ene 2026",
    slug: "lider-transformacion-digital",
  },
  {
    id: 3,
    image: "/kultiva/images/blog/post3.jpg",
    category: "Comunicacion",
    title: "Comunicacion interna efectiva en equipos remotos",
    excerpt:
      "Estrategias practicas para mantener conectados y alineados a los equipos que trabajan de forma remota.",
    date: "5 Ene 2026",
    slug: "comunicacion-equipos-remotos",
  },
  {
    id: 4,
    image: "/kultiva/images/blog/post4.jpg",
    category: "Cambio",
    title: "Como gestionar la resistencia al cambio",
    excerpt:
      "Tecnicas probadas para superar la resistencia y lograr que tu equipo adopte nuevos procesos.",
    date: "28 Dic 2025",
    slug: "gestionar-resistencia-cambio",
  },
  {
    id: 5,
    image: "/kultiva/images/blog/post5.jpg",
    category: "Seleccion",
    title: "El futuro del reclutamiento: tendencias 2026",
    excerpt:
      "Las principales tendencias que estan transformando la forma de atraer y seleccionar talento.",
    date: "20 Dic 2025",
    slug: "futuro-reclutamiento-2026",
  },
  {
    id: 6,
    image: "/kultiva/images/blog/post6.jpg",
    category: "Cultura",
    title: "Medicion del clima laboral: por donde empezar",
    excerpt:
      "Una guia practica para implementar tu primera encuesta de clima organizacional.",
    date: "15 Dic 2025",
    slug: "medicion-clima-laboral",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return {
    title: t("hero.title"),
  };
}

export default async function BlogPage() {
  const t = await getTranslations("blog");

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />

      <section className="kultiva-section">
        <div className="kultiva-container">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle={t("subtitle")}
              title={t("title")}
              centered
            />
          </AnimatedElement>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <AnimatedElement
                key={post.id}
                animation="fade-up"
                delay={100 + (index % 3) * 100}
              >
                <BlogCard
                  image={post.image}
                  category={post.category}
                  title={post.title}
                  excerpt={post.excerpt}
                  date={post.date}
                  href={`/blog/${post.slug}`}
                />
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
