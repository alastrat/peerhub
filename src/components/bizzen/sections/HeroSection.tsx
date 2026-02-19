"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Slider from "react-slick";

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face",
    stat: "200+",
    statKey: "clients",
    description: "Empresas de todos los tamaños confían en nosotros para transformar su cultura organizacional y potenciar su talento.",
  },
  {
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face",
    stat: "500+",
    statKey: "projects",
    description: "Proyectos exitosos en selección, cambio organizacional y comunicación interna que generan resultados medibles.",
  },
  {
    image: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=300&h=300&fit=crop&crop=face",
    stat: "15+",
    statKey: "years",
    description: "Años de experiencia acompañando a organizaciones en Colombia y Latinoamérica en su camino hacia la excelencia.",
  },
];

export function HeroSection() {
  const t = useTranslations("home.hero");
  const tStats = useTranslations("home.stats");

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    pauseOnHover: true,
    fade: true,
  };

  return (
    <section className="bizzen-hero">
      <div
        className="bizzen-hero_one bg_cover"
        style={{
          backgroundColor: "var(--header-dark-color)",
          backgroundImage: "none",
        }}
      >
        <div className="hero-bg-shape" />
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-8">
              {/* Hero Content */}
              <div className="hero-content">
                <span
                  className="sub-title"
                  data-aos="fade-down"
                  data-aos-duration="1000"
                >
                  {t("subtitle")}
                </span>
                <h1 className="text-anm">
                  {t("title")}
                </h1>
                <div
                  className="hero-button"
                  data-aos="fade-up"
                  data-aos-duration="1400"
                >
                  <Link href="/contacto" className="theme-btn style-one">
                    {t("cta_secondary")}
                    <i className="far fa-arrow-right" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              {/* Hero Carousel */}
              <div
                className="text-box mb-5 mb-xl-0"
                data-aos="fade-up"
                data-aos-duration="1000"
              >
                <Slider {...sliderSettings}>
                  {heroSlides.map((slide, index) => (
                    <div key={index}>
                      <div className="avatar-list">
                        <img
                          src={slide.image}
                          alt="Professional"
                          style={{
                            width: "200px",
                            height: "200px",
                            borderRadius: "12px",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <h4>
                        {slide.stat} <span>{tStats(slide.statKey)}</span>
                      </h4>
                      <p>{slide.description}</p>
                    </div>
                  ))}
                </Slider>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-12">
              {/* Hero Image */}
              <div
                className="hero-image text-center"
                data-aos="fade-up"
                data-aos-duration="1200"
              >
                <img
                  src="/images/hero/hero-conference.jpg"
                  alt="hero image"
                />
                <div className="hero-rating-box">
                  <h2>15+</h2>
                  <div className="ratings">
                    <i className="fas fa-star" />
                    <i className="fas fa-star" />
                    <i className="fas fa-star" />
                    <i className="fas fa-star" />
                    <i className="fas fa-star" />
                  </div>
                  <p>{tStats("years")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
