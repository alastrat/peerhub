import { PageHero } from "@/components/kultiva/layout";
import { Button } from "@/components/kultiva/ui";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Calendar, User, Tag, Share2 } from "lucide-react";

// Placeholder - will be replaced with Sanity CMS data
const post = {
  title: "5 claves para construir una cultura organizacional solida",
  category: "Cultura",
  date: "15 Enero 2026",
  author: "Iskya Boom",
  authorRole: "CEO & Fundadora",
  image: "/images/team/team-workshop.jpg",
  content: `
    <p>La cultura organizacional es el conjunto de valores, creencias y comportamientos que definen como opera una empresa. Una cultura solida no solo atrae y retiene talento, sino que tambien impulsa el rendimiento y la innovacion.</p>

    <h2>1. Define claramente tus valores</h2>
    <p>Los valores son la base de tu cultura. Deben ser claros, memorables y, sobre todo, vividos en el dia a dia. No basta con escribirlos en un documento; deben reflejarse en cada decision y comportamiento de la organizacion.</p>

    <h2>2. Lidera con el ejemplo</h2>
    <p>Los lideres son los principales arquitectos de la cultura. Sus acciones hablan mas fuerte que cualquier politica escrita. Si quieres una cultura de transparencia, los lideres deben ser los primeros en comunicarse abiertamente.</p>

    <h2>3. Contrata por fit cultural</h2>
    <p>Las habilidades se pueden ensenar, pero los valores son dificiles de cambiar. Asegurate de que tu proceso de seleccion evalue el alineamiento cultural tanto como las competencias tecnicas.</p>

    <h2>4. Celebra los comportamientos deseados</h2>
    <p>Lo que se reconoce se repite. Crea sistemas de reconocimiento que premien los comportamientos alineados con tu cultura. Esto refuerza lo que esperas de tus colaboradores.</p>

    <h2>5. Mide y ajusta continuamente</h2>
    <p>La cultura no es estatica. Realiza encuestas periodicas de clima, escucha el feedback de tu equipo y ajusta tus estrategias segun sea necesario. La mejora continua es clave.</p>

    <h2>Conclusion</h2>
    <p>Construir una cultura organizacional solida requiere tiempo, intencion y consistencia. No es un proyecto con fecha de finalizacion, sino un proceso continuo de cultivo y refinamiento. Los resultados, sin embargo, valen la pena: mayor engagement, mejor retencion y un equipo alineado con tu proposito.</p>
  `,
};

export async function generateMetadata() {
  return {
    title: post.title,
  };
}

export default function BlogPostPage() {
  return (
    <>
      <PageHero title={post.title} breadcrumb="Blog" />

      <section className="kultiva-section">
        <div className="kultiva-container">
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            <AnimatedElement animation="fade-up">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-kultiva-primary hover:text-kultiva-primary-dark transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Blog
              </Link>
            </AnimatedElement>

            {/* Meta info */}
            <AnimatedElement animation="fade-up" delay={100}>
              <div className="flex flex-wrap items-center gap-6 text-sm text-kultiva-charcoal/70 mb-8">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {post.date}
                </span>
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {post.category}
                </span>
              </div>
            </AnimatedElement>

            {/* Featured image */}
            <AnimatedElement animation="fade-up" delay={200}>
              <img
                src={post.image}
                alt={post.title}
                className="w-full aspect-[16/9] object-cover rounded-2xl mb-10"
              />
            </AnimatedElement>

            {/* Content */}
            <AnimatedElement animation="fade-up" delay={300}>
              <article
                className="prose prose-lg max-w-none prose-headings:font-kanit prose-headings:text-kultiva-ink prose-p:text-kultiva-charcoal/80 prose-a:text-kultiva-primary prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </AnimatedElement>

            {/* Author card */}
            <AnimatedElement animation="fade-up" delay={400}>
              <div className="kultiva-card kultiva-card-bordered p-8 mt-12">
                <div className="flex items-center gap-6">
                  <img
                    src="/images/team/iskya-speaking.jpg"
                    alt={post.author}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-lg font-semibold">{post.author}</h4>
                    <p className="text-kultiva-charcoal/70 text-sm mb-2">
                      {post.authorRole}
                    </p>
                    <p className="text-sm text-kultiva-charcoal/70">
                      Experta en desarrollo organizacional con mas de 15 anos de
                      experiencia transformando culturas empresariales.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedElement>

            {/* Share */}
            <AnimatedElement animation="fade-up" delay={500}>
              <div className="flex items-center justify-between mt-10 pt-10 border-t border-kultiva-border">
                <span className="text-sm text-kultiva-charcoal/70">
                  Comparte este articulo:
                </span>
                <div className="flex items-center gap-3">
                  <button className="w-10 h-10 rounded-full border border-kultiva-border flex items-center justify-center hover:bg-kultiva-primary hover:border-kultiva-primary hover:text-white transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </AnimatedElement>
          </div>
        </div>
      </section>
    </>
  );
}
