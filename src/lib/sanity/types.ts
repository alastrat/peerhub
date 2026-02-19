export type Locale = "es" | "en";

// Sanity image source type - compatible with @sanity/image-url
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SanityImageSource = any;

export interface LocaleString {
  es?: string;
  en?: string;
}

export interface LocaleText {
  es?: string;
  en?: string;
}

export interface LocaleBlockContent {
  es?: SanityBlock[];
  en?: SanityBlock[];
}

export interface SanityBlock {
  _type: "block";
  _key: string;
  style?: string;
  children: {
    _type: "span";
    _key: string;
    text: string;
    marks?: string[];
  }[];
  markDefs?: {
    _type: string;
    _key: string;
    href?: string;
  }[];
}

export interface SanityDocument {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  _rev: string;
}

export interface SanityImage {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  alt?: string;
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface Author extends SanityDocument {
  _type: "author";
  name: LocaleString;
  slug: { current: string };
  image?: SanityImage;
  bio?: LocaleText;
}

export interface Category extends SanityDocument {
  _type: "category";
  name: LocaleString;
  slug: { current: string };
  description?: LocaleText;
}

export interface Post extends SanityDocument {
  _type: "post";
  title: LocaleString;
  slug: { current: string };
  excerpt?: LocaleText;
  body?: LocaleBlockContent;
  mainImage?: SanityImage;
  publishedAt: string;
  author?: Author;
  categories?: Category[];
}

export interface Testimonial extends SanityDocument {
  _type: "testimonial";
  name: LocaleString;
  role?: LocaleString;
  company?: string;
  quote: LocaleText;
  image?: SanityImage;
  rating?: number;
  order?: number;
}

export interface TeamMember extends SanityDocument {
  _type: "teamMember";
  name: LocaleString;
  role: LocaleString;
  bio?: LocaleText;
  image?: SanityImage;
  order?: number;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    email?: string;
  };
}

export interface Client extends SanityDocument {
  _type: "client";
  name: LocaleString;
  logo: SanityImage;
  url?: string;
  order?: number;
}

export interface ServiceFAQ {
  _key: string;
  question: LocaleString;
  answer: LocaleText;
}

export interface ServiceBenefit {
  _key: string;
  title: LocaleString;
  description?: LocaleText;
}

export interface Service extends SanityDocument {
  _type: "service";
  title: LocaleString;
  slug: { current: string };
  icon?: string;
  shortDescription: LocaleText;
  fullDescription?: LocaleBlockContent;
  image?: SanityImage;
  benefits?: ServiceBenefit[];
  faqs?: ServiceFAQ[];
  order?: number;
}

export interface FAQ extends SanityDocument {
  _type: "faq";
  question: LocaleString;
  answer: LocaleText;
  category?: string;
  order?: number;
}

export interface HeroSlide extends SanityDocument {
  _type: "heroSlide";
  title: LocaleString;
  subtitle?: LocaleText;
  ctaText?: LocaleString;
  ctaUrl?: string;
  image?: SanityImage;
  order?: number;
}

export interface SiteSettings extends SanityDocument {
  _type: "siteSettings";
  siteName?: LocaleString;
  siteDescription?: LocaleText;
  contactInfo?: {
    address?: string;
    phone?: string;
    email?: string;
    hours?: LocaleString;
  };
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  footerText?: LocaleText;
}

// Resolved types (with locale selected)
export interface ResolvedPost {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  body?: SanityBlock[];
  mainImage?: SanityImageSource;
  publishedAt: string;
  author?: {
    name: string;
    image?: SanityImageSource;
  };
  categories?: {
    name: string;
    slug: string;
  }[];
}

export interface ResolvedTestimonial {
  _id: string;
  name: string;
  role?: string;
  company?: string;
  quote: string;
  image?: SanityImageSource;
  rating?: number;
}

export interface ResolvedTeamMember {
  _id: string;
  name: string;
  role: string;
  bio?: string;
  image?: SanityImageSource;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    email?: string;
  };
}

export interface ResolvedClient {
  _id: string;
  name: string;
  logo: SanityImageSource;
  url?: string;
}

export interface ResolvedService {
  _id: string;
  slug: string;
  title: string;
  icon?: string;
  shortDescription: string;
  fullDescription?: SanityBlock[];
  image?: SanityImageSource;
  benefits?: {
    _key: string;
    title: string;
    description?: string;
  }[];
  faqs?: {
    _key: string;
    question: string;
    answer: string;
  }[];
}

export interface ResolvedFAQ {
  _id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface ResolvedHeroSlide {
  _id: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  image?: SanityImageSource;
}
