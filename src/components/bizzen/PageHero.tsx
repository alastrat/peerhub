"use client";

import { Link } from "@/i18n/navigation";

interface PageHeroProps {
  title: string;
  breadcrumb: string;
  backgroundImage?: string;
}

const defaultBackground = "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920&q=80";

export function PageHero({ title, breadcrumb, backgroundImage }: PageHeroProps) {
  return (
    <section
      className="page-hero bg_cover p-r z-1"
      style={{
        backgroundImage: `url(${backgroundImage || defaultBackground})`,
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="page-content text-center">
              <h1>{title}</h1>
              <ul>
                <li>
                  <Link href="/">Inicio</Link>
                </li>
                <li>{breadcrumb}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
