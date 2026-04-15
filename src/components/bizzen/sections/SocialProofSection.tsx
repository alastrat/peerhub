"use client";

import Slider from "react-slick";
import { useTranslations } from "next-intl";

const STORY_KEYS = ["1", "2", "3", "4"] as const;

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

export function SocialProofSection() {
  const t = useTranslations("home.social_proof");

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
            <Slider {...sliderSettings} className="testimonial-slider">
              {STORY_KEYS.map((key) => (
                <div
                  key={key}
                  className="bizzen-testimonial-item style-one"
                >
                  <div className="testimonial-content">
                    <p>&ldquo;{t(`stories.${key}.quote`)}&rdquo;</p>
                    <div className="ratings">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <i key={i} className="fas fa-star" />
                      ))}
                    </div>
                    <div className="author-thumb-item">
                      <div className="author-info">
                        <h5>{t(`stories.${key}.name`)}</h5>
                        <span className="position">
                          {t(`stories.${key}.role`)},{" "}
                          {t(`stories.${key}.company`)}
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
