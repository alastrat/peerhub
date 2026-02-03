"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface ServiceFAQProps {
  serviceKey: string;
}

export function ServiceFAQ({ serviceKey }: ServiceFAQProps) {
  const t = useTranslations("services");
  const [openIndex, setOpenIndex] = useState<number>(0);

  const faqs = [1, 2, 3].map((num) => ({
    question: t(`${serviceKey}.faq.${num}.question`),
    answer: t(`${serviceKey}.faq.${num}.answer`),
  }));

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div className="faq-wrapper">
      <div className="row">
        <div className="col-xl-6">
          <div className="section-title">
            <span className="sub-title" data-aos="fade-down" data-aos-duration="1000">
              FAQ
            </span>
            <h2 className="text-anm">{t("faq.title")}</h2>
          </div>
          <div className="bizzen-button mt-40 mb-5 mb-xl-0" data-aos="fade-up" data-aos-duration="1200">
            <Link href="/faq" className="theme-btn style-one">
              {t("faq.see_all")} <i className="far fa-arrow-right"></i>
            </Link>
          </div>
        </div>
        <div className="col-xl-6">
          {/* Accordion */}
          <div className="accordion" data-aos="fade-up" data-aos-duration="1000">
            {faqs.map((faq, index) => (
              <div key={index} className="accordion-card style-two mb-25">
                <div className="accordion-header">
                  <h6
                    className={`accordion-title ${openIndex === index ? "" : "collapsed"}`}
                    onClick={() => toggleAccordion(index)}
                    style={{ cursor: "pointer" }}
                    aria-expanded={openIndex === index}
                  >
                    {faq.question}
                  </h6>
                </div>
                {openIndex === index && (
                  <div className="accordion-content">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
