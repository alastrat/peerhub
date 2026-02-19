import { getClient } from "./client";
import {
  postsQuery,
  postBySlugQuery,
  recentPostsQuery,
  categoriesQuery,
  testimonialsQuery,
  teamMembersQuery,
  clientsQuery,
  servicesQuery,
  serviceBySlugQuery,
  faqsQuery,
  faqsByCategoryQuery,
  heroSlidesQuery,
  siteSettingsQuery,
  postSlugsQuery,
  serviceSlugsQuery,
} from "./queries";
import type {
  Locale,
  ResolvedPost,
  ResolvedTestimonial,
  ResolvedTeamMember,
  ResolvedClient,
  ResolvedService,
  ResolvedFAQ,
  ResolvedHeroSlide,
} from "./types";

type FetchOptions = {
  preview?: boolean;
  revalidate?: number | false;
};

const DEFAULT_REVALIDATE = 60; // 60 seconds

// Blog Posts
export async function getPosts(
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedPost[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    postsQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

export async function getPostBySlug(
  slug: string,
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedPost | null> {
  const client = getClient(options?.preview);
  return client.fetch(
    postBySlugQuery,
    { slug, locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

export async function getRecentPosts(
  locale: Locale,
  limit: number = 3,
  options?: FetchOptions
): Promise<ResolvedPost[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    recentPostsQuery,
    { locale, limit },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

export async function getPostSlugs(): Promise<string[]> {
  const client = getClient();
  return client.fetch(postSlugsQuery);
}

// Categories
export async function getCategories(
  locale: Locale,
  options?: FetchOptions
): Promise<{ _id: string; name: string; slug: string; description?: string }[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    categoriesQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

// Testimonials
export async function getTestimonials(
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedTestimonial[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    testimonialsQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

// Team Members
export async function getTeamMembers(
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedTeamMember[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    teamMembersQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

// Clients
export async function getClients(
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedClient[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    clientsQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

// Services
export async function getServices(
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedService[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    servicesQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

export async function getServiceBySlug(
  slug: string,
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedService | null> {
  const client = getClient(options?.preview);
  return client.fetch(
    serviceBySlugQuery,
    { slug, locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

export async function getServiceSlugs(): Promise<string[]> {
  const client = getClient();
  return client.fetch(serviceSlugsQuery);
}

// FAQs
export async function getFAQs(
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedFAQ[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    faqsQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

export async function getFAQsByCategory(
  category: string,
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedFAQ[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    faqsByCategoryQuery,
    { category, locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

// Hero Slides
export async function getHeroSlides(
  locale: Locale,
  options?: FetchOptions
): Promise<ResolvedHeroSlide[]> {
  const client = getClient(options?.preview);
  return client.fetch(
    heroSlidesQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}

// Site Settings
export async function getSiteSettings(
  locale: Locale,
  options?: FetchOptions
): Promise<{
  _id: string;
  siteName?: string;
  siteDescription?: string;
  contactInfo?: {
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;
  };
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  footerText?: string;
} | null> {
  const client = getClient(options?.preview);
  return client.fetch(
    siteSettingsQuery,
    { locale },
    { next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE } }
  );
}
