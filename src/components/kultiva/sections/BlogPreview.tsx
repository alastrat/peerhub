"use client";

import { useTranslations } from "next-intl";
import { SectionTitle } from "../ui/SectionTitle";
import { BlogCard } from "../ui/Card";
import { Button } from "../ui/Button";
import { AnimatedElement } from "../ui/AnimatedElement";
import { ArrowRight } from "lucide-react";

// Placeholder blog posts - will be replaced with Sanity CMS data
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
];

export function BlogPreview() {
  const t = useTranslations("home.blog");

  return (
    <section className="kultiva-section kultiva-section-gray">
      <div className="kultiva-container">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle={t("subtitle")}
              title={t("title")}
              className="mb-0"
            />
          </AnimatedElement>

          <AnimatedElement animation="fade-up" delay={200}>
            <Button
              href="/blog"
              variant="outline"
              className="mt-6 lg:mt-0 group"
            >
              {t("cta")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </AnimatedElement>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <AnimatedElement
              key={post.id}
              animation="fade-up"
              delay={100 + index * 100}
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
  );
}
