"use client";

import { useTranslations } from "next-intl";
import Slider from "react-slick";

const testimonialImages = [
  "/images/team/testimonial-1.jpg",
  "/images/team/testimonial-2.jpg",
  "/images/clients/fintra-logo.jpg",
];

export function TestimonialSection() {
  const t = useTranslations("home.testimonials");

  const testimonials = [
    {
      quote: t("items.1.quote"),
      author: t("items.1.name"),
      role: t("items.1.role"),
      company: t("items.1.company"),
      image: testimonialImages[0],
    },
    {
      quote: t("items.2.quote"),
      author: t("items.2.name"),
      role: t("items.2.role"),
      company: t("items.2.company"),
      image: testimonialImages[1],
    },
    {
      quote: t("items.3.quote"),
      author: t("items.3.name"),
      role: t("items.3.role"),
      company: t("items.3.company"),
      image: testimonialImages[2],
    },
  ];

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: false,
    fade: true,
    cssEase: "linear",
  };

  return (
    <section className="bizzen-testimonial_one pt-80 pb-110">
      <div
        className="testimonial-map-bg bg_cover"
        style={{
          backgroundImage:
            "url(/bizzen/images/home-one/testimonial/map-bg.png)",
        }}
      />
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            {/* Quote Box */}
            <div className="quote-box text-center mb-40">
              <img
                src="/bizzen/images/home-one/testimonial/quote.png"
                alt="quote"
              />
            </div>
          </div>
        </div>
        <div className="row justify-content-center">
          <div className="col-lg-10">
            {/* Testimonial Slider */}
            <Slider {...sliderSettings} className="testimonial-slider">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bizzen-testimonial-item style-one">
                  <div className="testimonial-content">
                    <p>"{testimonial.quote}"</p>
                    <div className="ratings">
                      <i className="fas fa-star" />
                      <i className="fas fa-star" />
                      <i className="fas fa-star" />
                      <i className="fas fa-star" />
                      <i className="fas fa-star" />
                    </div>
                    <div className="author-thumb-item">
                      <div className="author-thumb">
                        <img src={testimonial.image} alt={testimonial.author} />
                      </div>
                      <div className="author-info">
                        <h5>{testimonial.author}</h5>
                        <span className="position">
                          {testimonial.role}, {testimonial.company}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </div>
    </section>
  );
}
