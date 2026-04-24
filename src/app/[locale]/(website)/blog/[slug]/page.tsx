import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { PageHero } from "@/components/bizzen/PageHero";
import { Link } from "@/i18n/navigation";
import {
  getPostBySlug,
  getRecentPosts,
  getImageUrl,
  type Locale,
} from "@/lib/sanity";

const fallbackImage = "/images/team/team-workshop.jpg";
const fallbackThumb = "/images/team/team-workshop.jpg";

const portableComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    normal: ({ children }) => <p>{children}</p>,
  },
  marks: {
    link: ({ value, children }) => (
      <a href={value?.href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ),
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await getPostBySlug(slug, locale as Locale);
  if (!post) return { title: "Blog" };

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const sanityLocale = locale as Locale;

  const [post, recentPosts] = await Promise.all([
    getPostBySlug(slug, sanityLocale),
    getRecentPosts(sanityLocale, 4),
  ]);

  if (!post) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "blog" });

  const dateLocale = locale === "en" ? "en-US" : "es-ES";
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const mainImage =
    (post.mainImage
      ? getImageUrl(post.mainImage, {
          width: 1200,
          height: 630,
          fit: "crop",
        })
      : null) || fallbackImage;

  const authorName = post.author?.name || "Kultiva";
  const category = post.categories?.[0]?.name || "Blog";

  const sidebarPosts = recentPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 3)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      image:
        (p.mainImage
          ? getImageUrl(p.mainImage, {
              width: 120,
              height: 120,
              fit: "crop",
            })
          : null) || fallbackThumb,
      date: p.publishedAt
        ? new Date(p.publishedAt).toLocaleDateString(dateLocale, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "",
    }));

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={post.title} />

      <section className="bizzen-blog-standard-sec pt-120 pb-120">
        <div className="container">
          <div className="row">
            <div className="col-xl-8">
              <div className="blog-details-wrapper">
                <div
                  className="blog-post-main mb-70"
                  data-aos="fade-up"
                  data-aos-duration="1000"
                >
                  <div className="blog-post-item">
                    <div className="post-thumbnail">
                      <img src={mainImage} alt={post.title} />
                    </div>
                    <div
                      className="post-content"
                      data-aos="fade-up"
                      data-aos-duration="800"
                    >
                      <div className="post-meta">
                        <span>
                          <i className="far fa-user" /> {t("by")}{" "}
                          <a href="#">{authorName}</a>
                        </span>
                        <span>
                          <i className="far fa-tags" />
                          <a href="#">{category}</a>
                        </span>
                        {formattedDate && (
                          <span>
                            <i className="far fa-calendar" />
                            <a href="#">{formattedDate}</a>
                          </span>
                        )}
                      </div>
                      <h4 className="title">{post.title}</h4>
                      {post.excerpt && <p>{post.excerpt}</p>}
                      {post.body && post.body.length > 0 && (
                        <PortableText
                          value={post.body}
                          components={portableComponents}
                        />
                      )}
                      {post.externalUrl && (
                        <div
                          className="bizzen-button mt-30"
                          data-aos="fade-up"
                          data-aos-duration="1000"
                        >
                          <a
                            href={post.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="theme-btn style-one"
                          >
                            {t("read_original")}{" "}
                            <i className="far fa-arrow-right" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="post-navigation mb-70"
                  data-aos="fade-up"
                  data-aos-duration="1000"
                >
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

            <div className="col-xl-4">
              <div className="sidebar-widget-area mb-20">
                <div
                  className="sidebar-widget sidebar-post-widget mb-40"
                  data-aos="fade-up"
                  data-aos-duration="1000"
                >
                  <h4 className="widget-title">{t("recent_posts")}</h4>
                  <div className="widget-content">
                    <ul className="recent-post-list">
                      {sidebarPosts.map((recentPost) => (
                        <li
                          key={recentPost.slug}
                          className="post-thumbnail-content mb-4"
                        >
                          <img
                            src={recentPost.image}
                            alt={recentPost.title}
                          />
                          <div className="post-title-date">
                            {recentPost.date && (
                              <span className="posted-on">
                                <a href="#">{recentPost.date}</a>
                              </span>
                            )}
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
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
