// Object types
import { localeString } from "./objects/localeString";
import { localeText } from "./objects/localeText";
import { blockContent } from "./objects/blockContent";
import { localeBlockContent } from "./objects/localeBlockContent";

// Document types
import { author } from "./documents/author";
import { category } from "./documents/category";
import { post } from "./documents/post";
import { testimonial } from "./documents/testimonial";
import { teamMember } from "./documents/teamMember";
import { client } from "./documents/client";
import { service } from "./documents/service";
import { faq } from "./documents/faq";
import { heroSlide } from "./documents/heroSlide";
import { siteSettings } from "./documents/siteSettings";

export const schemaTypes = [
  // Objects (must be defined before documents that use them)
  localeString,
  localeText,
  blockContent,
  localeBlockContent,

  // Documents
  author,
  category,
  post,
  testimonial,
  teamMember,
  client,
  service,
  faq,
  heroSlide,
  siteSettings,
];
