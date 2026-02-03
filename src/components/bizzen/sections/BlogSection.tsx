"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const posts = [
  {
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop",
    category: "Cultura",
    date: "15 Ene, 2026",
    title: "5 claves para construir una cultura organizacional sólida",
    excerpt:
      "Descubre las estrategias fundamentales para desarrollar una cultura que impulse el compromiso y los resultados.",
    slug: "5-claves-cultura-organizacional",
    duration: 1000,
  },
  {
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop",
    category: "Liderazgo",
    date: "10 Ene, 2026",
    title: "El rol del líder en la transformación digital",
    excerpt:
      "Cómo los líderes pueden guiar a sus equipos a través del cambio tecnológico manteniendo el enfoque humano.",
    slug: "lider-transformacion-digital",
    duration: 1200,
  },
  {
    image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=400&fit=crop",
    category: "Comunicación",
    date: "5 Ene, 2026",
    title: "Comunicación interna efectiva en equipos remotos",
    excerpt:
      "Estrategias prácticas para mantener conectados y alineados a los equipos que trabajan de forma remota.",
    slug: "comunicacion-equipos-remotos",
    duration: 1400,
  },
];

export function BlogSection() {
  const t = useTranslations("home.blog");
  const tCommon = useTranslations("common");

  return (
    <section className="bizzen-blog-sec pt-110 pb-90">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-5 col-lg-10">
            {/* Bizzen Content Box */}
            <div className="bizzen-content-box mb-5 mb-xl-0 text-center text-xl-start">
              <div className="section-title">
                <span
                  className="sub-title"
                  data-aos="fade-down"
                  data-aos-duration="1000"
                >
                  {t("subtitle")}
                </span>
                <h2 className="text-anm">{t("title")}</h2>
              </div>
              <div
                className="bizzen-button"
                data-aos="fade-up"
                data-aos-duration="1000"
              >
                <Link href="/blog" className="theme-btn style-one">
                  {t("cta").toUpperCase()}{" "}
                  <i className="far fa-arrow-right" />
                </Link>
              </div>
            </div>
          </div>

          <div className="col-xl-7 col-lg-10">
            {/* Bizzen Blog List */}
            <div className="bizzen-blog-list">
              {posts.map((post) => (
                <div
                  key={post.slug}
                  className="bizzen-blog-post-item style-one mb-30"
                  data-aos="fade-up"
                  data-aos-duration={post.duration}
                >
                  <div className="post-thumbnail">
                    <img src={post.image} alt="Post Thumbnail" />
                  </div>
                  <div className="post-content">
                    <div className="post-meta">
                      <span>
                        <Link href="/blog">{post.category}</Link>
                      </span>
                      <span>{post.date}</span>
                    </div>
                    <h4 className="title">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h4>
                    <p>{post.excerpt}</p>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="read-more style-one"
                    >
                      {tCommon("read_more").toUpperCase()}{" "}
                      <i className="far fa-arrow-right" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
