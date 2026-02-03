"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const faqKeys = ["services", "pricing", "timeline", "results", "team", "contact"];

export function FAQSection() {
  const t = useTranslations("faq");
  const [openIndex, setOpenIndex] = useState<number>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="bizzen-faq-sec pt-115 pb-95">
      <div className="container">
        <div className="row">
          <div className="col-xl-6">
            <div className="bizzen-content-box mb-5 mb-xl-0">
              <div className="section-title">
                <span
                  className="sub-title"
                  data-aos="fade-down"
                  data-aos-duration="1000"
                >
                  {t("subtitle")}
                </span>
                <h2 className="text-anm">{t("title")}</h2>
              </div>
              <p data-aos="fade-up" data-aos-duration="1200">
                {t("description")}
              </p>
            </div>
          </div>
          <div className="col-xl-6">
            {/* Accordion */}
            <div
              className="accordion"
              data-aos="fade-up"
              data-aos-duration="1200"
            >
              {faqKeys.map((key, index) => (
                <div key={key} className="accordion-card style-two mb-25">
                  <div className="accordion-header">
                    <h6
                      className={`accordion-title ${openIndex === index ? "" : "collapsed"}`}
                      onClick={() => toggleAccordion(index)}
                      style={{ cursor: "pointer" }}
                      aria-expanded={openIndex === index}
                    >
                      {t(`questions.${key}.question`)}
                    </h6>
                  </div>
                  {openIndex === index && (
                    <div className="accordion-content">
                      <p>{t(`questions.${key}.answer`)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
