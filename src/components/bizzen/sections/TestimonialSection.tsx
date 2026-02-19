"use client";

import Slider from "react-slick";
import type { ResolvedTestimonial } from "@/lib/sanity";
import { getImageUrl } from "@/lib/sanity";

// Fallback images when Sanity doesn't have images
const fallbackImages = [
  "/images/team/testimonial-1.jpg",
  "/images/team/testimonial-2.jpg",
  "/images/clients/fintra-logo.jpg",
];

interface TestimonialSectionProps {
  testimonials?: ResolvedTestimonial[];
}

export function TestimonialSection({ testimonials = [] }: TestimonialSectionProps) {
  // Map Sanity testimonials to component format
  const items = testimonials.map((t, index) => ({
    quote: t.quote || "",
    author: t.name || "",
    role: t.role || "",
    company: t.company || "",
    image: t.image ? getImageUrl(t.image, { width: 100, height: 100 }) : fallbackImages[index % fallbackImages.length],
    rating: t.rating || 5,
  }));

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
            {items.length > 0 && (
              <Slider {...sliderSettings} className="testimonial-slider">
                {items.map((item, index) => (
                  <div key={index} className="bizzen-testimonial-item style-one">
                    <div className="testimonial-content">
                      <p>"{item.quote}"</p>
                      <div className="ratings">
                        {[...Array(item.rating)].map((_, i) => (
                          <i key={i} className="fas fa-star" />
                        ))}
                      </div>
                      <div className="author-thumb-item">
                        <div className="author-thumb">
                          <img src={item.image || ""} alt={item.author} />
                        </div>
                        <div className="author-info">
                          <h5>{item.author}</h5>
                          <span className="position">
                            {item.role}, {item.company}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Slider>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
