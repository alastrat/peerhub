import { getTranslations } from "next-intl/server";
import { PageHero, BlogGridSection } from "@/components/bizzen";
import { getPosts, type Locale } from "@/lib/sanity";

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

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = await getPosts(locale as Locale);

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />
      <BlogGridSection posts={posts} locale={locale} />
    </>
  );
}
