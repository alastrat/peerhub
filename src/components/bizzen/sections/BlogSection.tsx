"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedPost } from "@/lib/sanity";
import { getImageUrl } from "@/lib/sanity";

// Fallback images
const fallbackImages = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=400&fit=crop",
];

interface BlogSectionProps {
  posts?: ResolvedPost[];
}

export function BlogSection({ posts: sanityPosts = [] }: BlogSectionProps) {
  const t = useTranslations("home.blog");
  const tCommon = useTranslations("common");

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Map Sanity posts to component format
  const posts = sanityPosts.map((p, index) => ({
    image: p.mainImage
      ? getImageUrl(p.mainImage, { width: 400, height: 400 })
      : fallbackImages[index % fallbackImages.length],
    category: p.categories?.[0]?.name || "Blog",
    date: p.publishedAt ? formatDate(p.publishedAt) : "",
    title: p.title || "",
    excerpt: p.excerpt || "",
    slug: p.slug || "",
    duration: 1000 + index * 200,
  }));

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
              {posts.map((post, index) => (
                <div
                  key={post.slug || index}
                  className="bizzen-blog-post-item style-one mb-30"
                  data-aos="fade-up"
                  data-aos-duration={post.duration}
                >
                  <div className="post-thumbnail">
                    <img src={post.image || ""} alt="Post Thumbnail" />
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
