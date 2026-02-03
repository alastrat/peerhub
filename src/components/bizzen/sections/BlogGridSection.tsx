"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const posts = [
  {
    image: "/bizzen/images/innerpage/blog/blog-grid1.jpg",
    day: "15",
    month: "Ene",
    author: "Admin",
    comments: 3,
    title: "5 claves para construir una cultura organizacional solida",
    excerpt:
      "Descubre las estrategias fundamentales para desarrollar una cultura que impulse el compromiso.",
    slug: "5-claves-cultura-organizacional",
    duration: 1000,
  },
  {
    image: "/bizzen/images/innerpage/blog/blog-grid2.jpg",
    day: "10",
    month: "Ene",
    author: "Admin",
    comments: 2,
    title: "El rol del lider en la transformacion digital",
    excerpt:
      "Como los lideres pueden guiar a sus equipos a traves del cambio tecnologico.",
    slug: "lider-transformacion-digital",
    duration: 1200,
  },
  {
    image: "/bizzen/images/innerpage/blog/blog-grid3.jpg",
    day: "5",
    month: "Ene",
    author: "Admin",
    comments: 5,
    title: "Comunicacion interna efectiva en equipos remotos",
    excerpt:
      "Estrategias practicas para mantener conectados a los equipos que trabajan de forma remota.",
    slug: "comunicacion-equipos-remotos",
    duration: 1400,
  },
  {
    image: "/bizzen/images/innerpage/blog/blog-grid4.jpg",
    day: "28",
    month: "Dic",
    author: "Admin",
    comments: 4,
    title: "Gestion del cambio: preparando a tu equipo para el futuro",
    excerpt:
      "Aprende como implementar cambios organizacionales de manera efectiva.",
    slug: "gestion-cambio-equipo",
    duration: 1600,
  },
  {
    image: "/bizzen/images/innerpage/blog/blog-grid5.jpg",
    day: "20",
    month: "Dic",
    author: "Admin",
    comments: 1,
    title: "Diagnostico de clima laboral: por que es importante",
    excerpt:
      "Entiende la importancia de medir y mejorar el clima organizacional.",
    slug: "diagnostico-clima-laboral",
    duration: 1800,
  },
  {
    image: "/bizzen/images/innerpage/blog/blog-grid6.jpg",
    day: "15",
    month: "Dic",
    author: "Admin",
    comments: 6,
    title: "Seleccion especializada: encontrando el talento adecuado",
    excerpt:
      "Mejores practicas para reclutar y seleccionar el talento que tu empresa necesita.",
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
