// Client
export { client, previewClient, getClient } from "./client";

// Image helpers
export { urlFor, getImageUrl, getImageDimensions } from "./image";

// Queries
export * from "./queries";

// Fetch functions
export {
  getPosts,
  getPostBySlug,
  getRecentPosts,
  getPostSlugs,
  getCategories,
  getTestimonials,
  getTeamMembers,
  getClients,
  getServices,
  getServiceBySlug,
  getServiceSlugs,
  getFAQs,
  getFAQsByCategory,
  getHeroSlides,
  getSiteSettings,
} from "./fetch";

// Types
export type {
  Locale,
  LocaleString,
  LocaleText,
  LocaleBlockContent,
  SanityBlock,
  SanityDocument,
  SanityImage,
  SanityImageSource,
  Author,
  Category,
  Post,
  Testimonial,
  TeamMember,
  Client,
  Service,
  ServiceFAQ,
  ServiceBenefit,
  FAQ,
  HeroSlide,
  SiteSettings,
  ResolvedPost,
  ResolvedTestimonial,
  ResolvedTeamMember,
  ResolvedClient,
  ResolvedService,
  ResolvedFAQ,
  ResolvedHeroSlide,
} from "./types";
