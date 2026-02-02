import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  className?: string;
}

export function ServiceCard({
  icon,
  title,
  description,
  href,
  className,
}: ServiceCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "kultiva-card kultiva-card-bordered group block",
        className
      )}
    >
      <div className="kultiva-icon-box group-hover:bg-kultiva-primary group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 group-hover:text-kultiva-primary transition-colors">
        {title}
      </h3>
      <p className="text-kultiva-charcoal/70 text-sm leading-relaxed mb-4">
        {description}
      </p>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-kultiva-primary">
        Conoce Mas
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </span>
    </Link>
  );
}

interface TeamCardProps {
  image: string;
  name: string;
  role: string;
  className?: string;
}

export function TeamCard({ image, name, role, className }: TeamCardProps) {
  return (
    <div className={cn("group text-center", className)}>
      <div className="relative overflow-hidden rounded-2xl mb-5">
        <img
          src={image}
          alt={name}
          className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-kultiva-ink/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h4 className="text-lg font-semibold mb-1">{name}</h4>
      <p className="text-kultiva-stone text-sm">{role}</p>
    </div>
  );
}

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  image?: string;
  className?: string;
}

export function TestimonialCard({
  quote,
  author,
  role,
  company,
  image,
  className,
}: TestimonialCardProps) {
  return (
    <div
      className={cn(
        "kultiva-card bg-white p-8 lg:p-10",
        className
      )}
    >
      <div className="mb-6">
        <svg
          className="w-10 h-10 text-kultiva-primary/20"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </div>
      <p className="text-lg text-kultiva-charcoal leading-relaxed mb-8">
        "{quote}"
      </p>
      <div className="flex items-center gap-4">
        {image && (
          <img
            src={image}
            alt={author}
            className="w-14 h-14 rounded-full object-cover"
          />
        )}
        <div>
          <h5 className="font-semibold text-kultiva-ink">{author}</h5>
          <p className="text-sm text-kultiva-stone">
            {role}, {company}
          </p>
        </div>
      </div>
    </div>
  );
}

interface BlogCardProps {
  image: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  href: string;
  className?: string;
}

export function BlogCard({
  image,
  category,
  title,
  excerpt,
  date,
  href,
  className,
}: BlogCardProps) {
  return (
    <Link
      href={href}
      className={cn("group block", className)}
    >
      <div className="relative overflow-hidden rounded-2xl mb-5">
        <img
          src={image}
          alt={title}
          className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-4 left-4 px-3 py-1 bg-kultiva-primary text-white text-xs font-medium rounded-full">
          {category}
        </span>
      </div>
      <div className="space-y-3">
        <time className="text-sm text-kultiva-stone">{date}</time>
        <h3 className="text-xl font-semibold group-hover:text-kultiva-primary transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="text-kultiva-charcoal/70 text-sm leading-relaxed line-clamp-2">
          {excerpt}
        </p>
      </div>
    </Link>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  className?: string;
}

export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <div className={cn("text-center", className)}>
      <div className="text-4xl lg:text-5xl font-bold text-kultiva-primary mb-2">
        {value}
      </div>
      <p className="text-kultiva-charcoal/70 text-sm">{label}</p>
    </div>
  );
}
