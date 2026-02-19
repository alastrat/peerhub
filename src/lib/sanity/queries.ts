// GROQ Queries for Sanity CMS
// Using plain template strings (groq tag is just for syntax highlighting)

// Blog Posts
export const postsQuery = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    "slug": slug.current,
    "title": title[$locale],
    "excerpt": excerpt[$locale],
    publishedAt,
    mainImage,
    "author": author->{
      "name": name[$locale],
      image
    },
    "categories": categories[]->{
      "name": name[$locale],
      "slug": slug.current
    }
  }
`;

export const postBySlugQuery = `
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    "slug": slug.current,
    "title": title[$locale],
    "excerpt": excerpt[$locale],
    "body": body[$locale],
    publishedAt,
    mainImage,
    "author": author->{
      "name": name[$locale],
      image,
      "bio": bio[$locale]
    },
    "categories": categories[]->{
      "name": name[$locale],
      "slug": slug.current
    }
  }
`;

export const recentPostsQuery = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...$limit] {
    _id,
    "slug": slug.current,
    "title": title[$locale],
    "excerpt": excerpt[$locale],
    publishedAt,
    mainImage,
    "author": author->{
      "name": name[$locale],
      image
    }
  }
`;

// Categories
export const categoriesQuery = `
  *[_type == "category"] | order(name[$locale] asc) {
    _id,
    "name": name[$locale],
    "slug": slug.current,
    "description": description[$locale]
  }
`;

// Testimonials
export const testimonialsQuery = `
  *[_type == "testimonial"] | order(order asc) {
    _id,
    "name": name[$locale],
    "role": role[$locale],
    company,
    "quote": quote[$locale],
    image,
    rating
  }
`;

// Team Members
export const teamMembersQuery = `
  *[_type == "teamMember"] | order(order asc) {
    _id,
    "name": name[$locale],
    "role": role[$locale],
    "bio": bio[$locale],
    image,
    socialLinks
  }
`;

// Clients
export const clientsQuery = `
  *[_type == "client"] | order(order asc) {
    _id,
    "name": name[$locale],
    logo,
    url
  }
`;

// Services
export const servicesQuery = `
  *[_type == "service"] | order(order asc) {
    _id,
    "slug": slug.current,
    "title": title[$locale],
    icon,
    "shortDescription": shortDescription[$locale],
    image
  }
`;

export const serviceBySlugQuery = `
  *[_type == "service" && slug.current == $slug][0] {
    _id,
    "slug": slug.current,
    "title": title[$locale],
    icon,
    "shortDescription": shortDescription[$locale],
    "fullDescription": fullDescription[$locale],
    image,
    "benefits": benefits[]{
      _key,
      "title": title[$locale],
      "description": description[$locale]
    },
    "faqs": faqs[]{
      _key,
      "question": question[$locale],
      "answer": answer[$locale]
    }
  }
`;

// FAQs
export const faqsQuery = `
  *[_type == "faq"] | order(order asc) {
    _id,
    "question": question[$locale],
    "answer": answer[$locale],
    category
  }
`;

export const faqsByCategoryQuery = `
  *[_type == "faq" && category == $category] | order(order asc) {
    _id,
    "question": question[$locale],
    "answer": answer[$locale],
    category
  }
`;

// Hero Slides
export const heroSlidesQuery = `
  *[_type == "heroSlide"] | order(order asc) {
    _id,
    "title": title[$locale],
    "subtitle": subtitle[$locale],
    "ctaText": ctaText[$locale],
    ctaUrl,
    image
  }
`;

// Site Settings (singleton)
export const siteSettingsQuery = `
  *[_type == "siteSettings"][0] {
    _id,
    "siteName": siteName[$locale],
    "siteDescription": siteDescription[$locale],
    contactInfo {
      address,
      phone,
      email,
      "hours": hours[$locale]
    },
    socialLinks,
    "footerText": footerText[$locale]
  }
`;

// All post slugs (for generateStaticParams)
export const postSlugsQuery = `
  *[_type == "post" && defined(slug.current)].slug.current
`;

// All service slugs (for generateStaticParams)
export const serviceSlugsQuery = `
  *[_type == "service" && defined(slug.current)].slug.current
`;
