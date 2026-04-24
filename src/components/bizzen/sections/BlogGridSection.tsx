"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedPost } from "@/lib/sanity";
import { getImageUrl } from "@/lib/sanity";

const fallbackImages = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop",
];

const monthShortEs = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const monthShortEn = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface BlogGridSectionProps {
  posts: ResolvedPost[];
  locale: string;
}

export function BlogGridSection({ posts, locale }: BlogGridSectionProps) {
  const t = useTranslations("blog");
  const tCommon = useTranslations("common");

  const months = locale === "en" ? monthShortEn : monthShortEs;

  const cards = posts.map((p, index) => {
    const date = p.publishedAt ? new Date(p.publishedAt) : null;
    return {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || "",
      author: p.author?.name || "Kultiva",
      image:
        (p.mainImage
          ? getImageUrl(p.mainImage, {
              width: 600,
              height: 400,
              fit: "crop",
            })
          : null) || fallbackImages[index % fallbackImages.length],
      day: date ? String(date.getDate()) : "",
      month: date ? months[date.getMonth()] : "",
      duration: 1000 + index * 200,
    };
  });

  if (cards.length === 0) {
    return (
      <section className="bizzen-blog-grid-sec pt-120 pb-120">
        <div className="container">
          <div className="row">
            <div className="col-lg-12 text-center">
              <p>{t("no_results")}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bizzen-blog-grid-sec pt-120 pb-120">
      <div className="container">
        <div className="row">
          {cards.map((post) => (
            <div key={post.slug} className="col-xl-4 col-md-6 col-sm-12">
              <div
                className="bizzen-blog-post-item style-two mb-35"
                data-aos="fade-up"
                data-aos-duration={post.duration}
              >
                <div className="post-thumbnail">
                  <img src={post.image} alt={post.title} />
                  {post.day && (
                    <div className="date">
                      {post.day} <span>{post.month}</span>
                    </div>
                  )}
                </div>
                <div className="post-content">
                  <div className="post-meta">
                    <span>
                      <i className="far fa-user" /> {t("by")}{" "}
                      <a href="#">{post.author}</a>
                    </span>
                  </div>
                  <h4 className="title">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h4>
                  {post.excerpt && <p>{post.excerpt}</p>}
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
      </div>
    </section>
  );
}
