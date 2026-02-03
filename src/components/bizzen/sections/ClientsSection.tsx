"use client";

import { useTranslations } from "next-intl";
import Slider from "react-slick";

const clientLogos = [
  "/images/clients/client-1.png",
  "/images/clients/client-2.png",
  "/images/clients/client-3.png",
  "/images/clients/client-4.png",
  "/images/clients/fintra-logo.jpg",
];

// Duplicate for seamless infinite scroll
const clients = [...clientLogos, ...clientLogos];

export function ClientsSection() {
  const t = useTranslations("home.clients");

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 3000,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    arrows: false,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  return (
    <section className="bizzen-company-sec pb-120">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div
              className="text-box text-center mb-30"
              data-aos="fade-up"
              data-aos-duration="1000"
            >
              <h6>{t("title")}</h6>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid">
        {/* Clients Slider */}
        <div data-aos="fade-up" data-aos-duration="1200">
          <Slider {...sliderSettings} className="clients-slider">
            {clients.map((logo, index) => (
              <div key={index} className="bizzen-client-item">
                <div 
                  className="client-img"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "60px",
                    padding: "0 15px",
                  }}
                >
                  <img 
                    src={logo} 
                    alt="Client Logo" 
                    style={{ 
                      maxHeight: "50px",
                      maxWidth: "120px",
                      width: "auto",
                      height: "auto",
                      objectFit: "contain",
                      filter: "grayscale(100%)", 
                      opacity: 0.7,
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = "grayscale(0%)";
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = "grayscale(100%)";
                      e.currentTarget.style.opacity = "0.7";
                    }}
                  />
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </section>
  );
}
