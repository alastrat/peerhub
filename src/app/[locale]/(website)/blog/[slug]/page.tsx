import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/bizzen/PageHero";
import { Link } from "@/i18n/navigation";

// Placeholder posts - will be replaced with Sanity CMS data
const blogPosts: Record<string, {
  title: string;
  category: string;
  date: string;
  day: string;
  month: string;
  author: string;
  authorRole: string;
  image: string;
  content: string;
  tags: string[];
}> = {
  "5-claves-cultura-organizacional": {
    title: "5 claves para construir una cultura organizacional solida",
    category: "Cultura",
    date: "15 Enero, 2026",
    day: "15",
    month: "Ene",
    author: "Iskya Boom",
    authorRole: "CEO & Fundadora",
    image: "/images/team/team-workshop.jpg",
    tags: ["Cultura", "Liderazgo", "Organizacion"],
    content: `
      <p>La cultura organizacional es el conjunto de valores, creencias y comportamientos que definen como opera una empresa. Una cultura solida no solo atrae y retiene talento, sino que tambien impulsa el rendimiento y la innovacion.</p>

      <h4>1. Define claramente tus valores</h4>
      <p>Los valores son la base de tu cultura. Deben ser claros, memorables y, sobre todo, vividos en el dia a dia. No basta con escribirlos en un documento; deben reflejarse en cada decision y comportamiento de la organizacion.</p>

      <h4>2. Lidera con el ejemplo</h4>
      <p>Los lideres son los principales arquitectos de la cultura. Sus acciones hablan mas fuerte que cualquier politica escrita. Si quieres una cultura de transparencia, los lideres deben ser los primeros en comunicarse abiertamente.</p>

      <blockquote>
        <div class="icon">
          <img src="/bizzen/images/innerpage/blog/quote.png" alt="quote">
        </div>
        <div class="content">
          <p>La cultura no es lo que dices que es. La cultura es lo que vives todos los dias en tu organizacion.</p>
          <h5>Iskya Boom</h5>
        </div>
      </blockquote>

      <h4>3. Contrata por fit cultural</h4>
      <p>Las habilidades se pueden ensenar, pero los valores son dificiles de cambiar. Asegurate de que tu proceso de seleccion evalue el alineamiento cultural tanto como las competencias tecnicas.</p>

      <h4>4. Celebra los comportamientos deseados</h4>
      <p>Lo que se reconoce se repite. Crea sistemas de reconocimiento que premien los comportamientos alineados con tu cultura. Esto refuerza lo que esperas de tus colaboradores.</p>

      <h4>5. Mide y ajusta continuamente</h4>
      <p>La cultura no es estatica. Realiza encuestas periodicas de clima, escucha el feedback de tu equipo y ajusta tus estrategias segun sea necesario. La mejora continua es clave.</p>

      <h4>Conclusion</h4>
      <p>Construir una cultura organizacional solida requiere tiempo, intencion y consistencia. No es un proyecto con fecha de finalizacion, sino un proceso continuo de cultivo y refinamiento. Los resultados, sin embargo, valen la pena: mayor engagement, mejor retencion y un equipo alineado con tu proposito.</p>
    `,
  },
  "lider-transformacion-digital": {
    title: "El rol del lider en la transformacion digital",
    category: "Cambio",
    date: "10 Enero, 2026",
    day: "10",
    month: "Ene",
    author: "Iskya Boom",
    authorRole: "CEO & Fundadora",
    image: "/images/team/conference-1.jpg",
    tags: ["Transformacion", "Liderazgo", "Digital"],
    content: `
      <p>La transformacion digital no es solo cuestion de tecnologia. Es fundamentalmente un cambio cultural que requiere lideres preparados para guiar a sus equipos a traves de la incertidumbre.</p>

      <h4>El lider como agente de cambio</h4>
      <p>En tiempos de transformacion, los lideres deben ser los primeros en adoptar nuevas formas de trabajo y demostrar apertura al cambio. Su ejemplo es crucial para reducir la resistencia del equipo.</p>

      <h4>Comunicacion constante</h4>
      <p>Durante periodos de cambio, la comunicacion debe triplicarse. Los colaboradores necesitan entender el por que detras de cada decision y como los afecta directamente.</p>

      <p>La clave esta en mantener un dialogo abierto, escuchar las preocupaciones y responder con honestidad, incluso cuando no se tienen todas las respuestas.</p>
    `,
  },
  "comunicacion-equipos-remotos": {
    title: "Comunicacion interna efectiva en equipos remotos",
    category: "Comunicacion",
    date: "5 Enero, 2026",
    day: "5",
    month: "Ene",
    author: "Iskya Boom",
    authorRole: "CEO & Fundadora",
    image: "/images/team/planning-session.jpg",
    tags: ["Comunicacion", "Remoto", "Equipos"],
    content: `
      <p>El trabajo remoto ha transformado la forma en que nos comunicamos. Sin los encuentros casuales de oficina, necesitamos ser mas intencionales en nuestra comunicacion.</p>

      <h4>Establece rituales de comunicacion</h4>
      <p>Las reuniones regulares de equipo, los check-ins individuales y los espacios para conversaciones informales son esenciales para mantener la conexion.</p>

      <h4>Usa los canales adecuados</h4>
      <p>No todo requiere una videollamada. Define que tipo de comunicacion va por cada canal: chat para temas rapidos, email para documentacion, video para discusiones complejas.</p>
    `,
  },
  "gestion-cambio-equipo": {
    title: "Gestion del cambio: preparando a tu equipo para el futuro",
    category: "Cambio",
    date: "28 Diciembre, 2025",
    day: "28",
    month: "Dic",
    author: "Iskya Boom",
    authorRole: "CEO & Fundadora",
    image: "/images/team/team-event.jpg",
    tags: ["Cambio", "Gestion", "Futuro"],
    content: `
      <p>El cambio es inevitable en cualquier organizacion. La diferencia entre el exito y el fracaso radica en como preparamos a nuestros equipos para navegarlo.</p>

      <h4>Anticipa y comunica</h4>
      <p>Los cambios sorpresivos generan resistencia. Siempre que sea posible, comunica con anticipacion y explica claramente las razones detras del cambio.</p>
    `,
  },
  "diagnostico-clima-laboral": {
    title: "Diagnostico de clima laboral: por que es importante",
    category: "Clima",
    date: "20 Diciembre, 2025",
    day: "20",
    month: "Dic",
    author: "Iskya Boom",
    authorRole: "CEO & Fundadora",
    image: "/images/hero/hero-event-1.jpg",
    tags: ["Clima", "Diagnostico", "Bienestar"],
    content: `
      <p>Medir el clima laboral no es solo una tendencia de recursos humanos. Es una herramienta estrategica que permite tomar decisiones informadas sobre el bienestar de tu equipo.</p>

      <h4>Que mide un diagnostico de clima</h4>
      <p>Un buen diagnostico evalua multiples dimensiones: satisfaccion laboral, relacion con lideres, comunicacion, oportunidades de desarrollo, equilibrio vida-trabajo, entre otros.</p>
    `,
  },
  "seleccion-especializada-talento": {
    title: "Seleccion especializada: encontrando el talento adecuado",
    category: "Seleccion",
    date: "15 Diciembre, 2025",
    day: "15",
    month: "Dic",
    author: "Iskya Boom",
    authorRole: "CEO & Fundadora",
    image: "/images/team/gallery-1.jpg",
    tags: ["Seleccion", "Talento", "Reclutamiento"],
    content: `
      <p>Encontrar el talento adecuado va mas alla de revisar curriculos. Requiere un proceso estructurado que evalue tanto las competencias tecnicas como el fit cultural.</p>

      <h4>Define el perfil ideal</h4>
      <p>Antes de iniciar la busqueda, ten claridad sobre las habilidades, experiencia y valores que buscas. Un perfil bien definido ahorra tiempo y mejora la calidad de los candidatos.</p>
    `,
  },
};

const recentPosts = [
  {
    slug: "5-claves-cultura-organizacional",
    title: "5 claves para construir una cultura organizacional",
    image: "/bizzen/images/innerpage/blog/post-thumb1.jpg",
    date: "Ene 15, 2026",
  },
  {
    slug: "lider-transformacion-digital",
    title: "El rol del lider en la transformacion digital",
    image: "/bizzen/images/innerpage/blog/post-thumb2.jpg",
    date: "Ene 10, 2026",
  },
  {
    slug: "comunicacion-equipos-remotos",
    title: "Comunicacion efectiva en equipos remotos",
    image: "/bizzen/images/innerpage/blog/post-thumb3.jpg",
    date: "Ene 5, 2026",
  },
];

const categories = [
  "Cultura Organizacional",
  "Gestion del Cambio",
  "Comunicacion Interna",
  "Seleccion de Talento",
  "Clima Laboral",
  "Liderazgo",
];

const popularTags = ["Cultura", "Liderazgo", "Cambio", "Comunicacion", "Talento", "Clima"];

export async function generateStaticParams() {
  return Object.keys(blogPosts).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts[slug];
  if (!post) return { title: "Blog" };

  return {
    title: post.title,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = blogPosts[slug];

  if (!post) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "blog" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={post.title} />

      {/* Blog Details Section */}
      <section className="bizzen-blog-standard-sec pt-120 pb-120">
        <div className="container">
          <div className="row">
            {/* Main Content */}
            <div className="col-xl-8">
              <div className="blog-details-wrapper">
                {/* Blog Post Main */}
                <div className="blog-post-main mb-70" data-aos="fade-up" data-aos-duration="1000">
                  <div className="blog-post-item">
                    <div className="post-thumbnail">
                      <img src={post.image} alt={post.title} />
                    </div>
                    <div className="post-content" data-aos="fade-up" data-aos-duration="800">
                      <div className="post-meta">
                        <span>
                          <i className="far fa-user" /> {t("by")}{" "}
                          <a href="#">{post.author}</a>
                        </span>
                        <span>
                          <i className="far fa-tags" />
                          <a href="#">{post.category}</a>
                        </span>
                        <span>
                          <i className="far fa-calendar" />
                          <a href="#">{post.date}</a>
                        </span>
                      </div>
                      <h4 className="title">{post.title}</h4>
                      <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    </div>
                  </div>
                  <div className="entry-footer mt-30" data-aos="fade-up" data-aos-duration="1000">
                    <div className="tag-links">
                      <span>Tags:</span>
                      {post.tags.map((tag, index) => (
                        <a key={index} href="#">{tag}</a>
                      ))}
                    </div>
                    <div className="social-share">
                      <span>Compartir:</span>
                      <a href="#"><i className="fab fa-facebook-f" /></a>
                      <a href="#"><i className="fab fa-instagram" /></a>
                      <a href="#"><i className="fab fa-linkedin-in" /></a>
                      <a href="#"><i className="fab fa-twitter" /></a>
                    </div>
                  </div>
                </div>

                {/* Post Navigation */}
                <div className="post-navigation mb-70" data-aos="fade-up" data-aos-duration="1000">
                  <div className="row">
                    <div className="col-6">
                      <Link href="/blog" className="nav-link prev">
                        <i className="far fa-arrow-left" /> {t("back_to_blog")}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-xl-4">
              <div className="sidebar-widget-area mb-20">
                {/* Search Widget */}
                <div className="sidebar-widget sidebar-search-widget mb-30" data-aos="fade-up" data-aos-duration="600">
                  <div className="widget-content">
                    <form>
                      <div className="form-group">
                        <input
                          type="search"
                          className="form_control"
                          placeholder={t("search_placeholder")}
                          name="search"
                        />
                        <button className="search-btn">
                          <i className="far fa-search" />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Category Widget */}
                <div className="sidebar-widget sidebar-nav-widget mb-30" data-aos="fade-up" data-aos-duration="800">
                  <h4 className="widget-title">{t("categories")}</h4>
                  <div className="widget-content">
                    <ul>
                      {categories.map((category, index) => (
                        <li key={index}>
                          <a href="#">
                            {category}{" "}
                            <span>
                              <i className="far fa-angle-right" />
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recent Posts Widget */}
                <div className="sidebar-widget sidebar-post-widget mb-40" data-aos="fade-up" data-aos-duration="1000">
                  <h4 className="widget-title">{t("recent_posts")}</h4>
                  <div className="widget-content">
                    <ul className="recent-post-list">
                      {recentPosts.map((recentPost) => (
                        <li key={recentPost.slug} className="post-thumbnail-content mb-4">
                          <img src={recentPost.image} alt={recentPost.title} />
                          <div className="post-title-date">
                            <span className="posted-on">
                              <a href="#">{recentPost.date}</a>
                            </span>
                            <h6>
                              <Link href={`/blog/${recentPost.slug}`}>
                                {recentPost.title}
                              </Link>
                            </h6>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tags Widget */}
                <div className="sidebar-widget sidebar-tag-widget mb-30" data-aos="fade-up" data-aos-duration="1200">
                  <h4 className="widget-title">{t("popular_tags")}</h4>
                  <div className="widget-content">
                    {popularTags.map((tag, index) => (
                      <a key={index} href="#">{tag}</a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
