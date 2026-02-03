"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const posts = [
  {
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
    day: "15",
    month: "Ene",
    author: "Iskya Boom",
    comments: 3,
    title: "5 claves para construir una cultura organizacional sólida",
    excerpt:
      "Descubre las estrategias fundamentales para desarrollar una cultura que impulse el compromiso.",
    slug: "5-claves-cultura-organizacional",
    duration: 1000,
  },
  {
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop",
    day: "10",
    month: "Ene",
    author: "Iskya Boom",
    comments: 2,
    title: "El rol del líder en la transformación digital",
    excerpt:
      "Cómo los líderes pueden guiar a sus equipos a través del cambio tecnológico.",
    slug: "lider-transformacion-digital",
    duration: 1200,
  },
  {
    image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=600&h=400&fit=crop",
    day: "5",
    month: "Ene",
    author: "Iskya Boom",
    comments: 5,
    title: "Comunicación interna efectiva en equipos remotos",
    excerpt:
      "Estrategias prácticas para mantener conectados a los equipos que trabajan de forma remota.",
    slug: "comunicacion-equipos-remotos",
    duration: 1400,
  },
  {
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
    day: "28",
    month: "Dic",
    author: "Iskya Boom",
    comments: 4,
    title: "Gestión del cambio: preparando a tu equipo para el futuro",
    excerpt:
      "Aprende cómo implementar cambios organizacionales de manera efectiva.",
    slug: "gestion-cambio-equipo",
    duration: 1600,
  },
  {
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=400&fit=crop",
    day: "20",
    month: "Dic",
    author: "Iskya Boom",
    comments: 1,
    title: "Diagnóstico de clima laboral: por qué es importante",
    excerpt:
      "Entiende la importancia de medir y mejorar el clima organizacional.",
    slug: "diagnostico-clima-laboral",
    duration: 1800,
  },
  {
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop",
    day: "15",
    month: "Dic",
    author: "Iskya Boom",
    comments: 6,
    title: "Selección especializada: encontrando el talento adecuado",
    excerpt:
      "Mejores prácticas para reclutar y seleccionar el talento que tu empresa necesita.",
    slug: "seleccion-especializada-talento",
    duration: 2000,
  },
];

export function BlogGridSection() {
  const t = useTranslations("blog");
  const tCommon = useTranslations("common");

  return (
    <section className="bizzen-blog-grid-sec pt-120 pb-120">
      <div className="container">
        <div className="row">
          {posts.map((post) => (
            <div key={post.slug} className="col-xl-4 col-md-6 col-sm-12">
              {/* Bizzen Blog Post */}
              <div
                className="bizzen-blog-post-item style-two mb-35"
                data-aos="fade-up"
                data-aos-duration={post.duration}
              >
                <div className="post-thumbnail">
                  <img src={post.image} alt={post.title} />
                  <div className="date">
                    {post.day} <span>{post.month}</span>
                  </div>
                </div>
                <div className="post-content">
                  <div className="post-meta">
                    <span>
                      <i className="far fa-user" /> {t("by")}{" "}
                      <a href="#">{post.author}</a>
                    </span>
                    <span>
                      <i className="far fa-comment" />
                      <a href="#">
                        {t("comments")} ({post.comments})
                      </a>
                    </span>
                  </div>
                  <h4 className="title">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h4>
                  <p>{post.excerpt}</p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="read-more style-one"
                  >
                    {tCommon("read_more")} <i className="far fa-arrow-right" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="row">
          <div className="col-lg-12">
            <div
              className="theme-pagination text-center mt-30"
              data-aos="fade-up"
              data-aos-duration="2200"
            >
              <ul>
                <li>
                  <a href="#">
                    <i className="far fa-arrow-left" />
                  </a>
                </li>
                <li>
                  <a href="#">01</a>
                </li>
                <li>
                  <a href="#">02</a>
                </li>
                <li>
                  <a href="#">03</a>
                </li>
                <li>
                  <a href="#">
                    <i className="far fa-arrow-right" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
