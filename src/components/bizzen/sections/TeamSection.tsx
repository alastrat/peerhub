"use client";

import { useTranslations } from "next-intl";

const team = [
  {
    name: "Iskya Boom",
    position: "CEO & Fundadora",
    image: "/images/team/iskya-speaking.jpg",
    linkedin: "https://www.linkedin.com/in/iskyaboom/",
    instagram: "https://www.instagram.com/kultiva.co",
    duration: 800,
  },
];

export function TeamSection() {
  const t = useTranslations("about.team");

  return (
    <section className="bizzen-team-sec gray-color p-r z-1 pt-115 pb-70">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-8">
            {/* Section Title */}
            <div className="section-title text-center mb-60">
              <span
                className="sub-title"
                data-aos="fade-down"
                data-aos-duration="800"
              >
                {t("subtitle")}
              </span>
              <h2 className="text-anm">{t("title")}</h2>
            </div>
          </div>
        </div>
        <div className="row justify-content-center">
          {team.map((member, index) => (
            <div key={index} className="col-xl-3 col-md-6 col-sm-12">
              {/* Bizzen Team Item */}
              <div
                className="bizzen-team-item style-two mb-40"
                data-aos="fade-up"
                data-aos-duration={member.duration}
              >
                <div className="member-image">
                  <img src={member.image} alt={member.name} />
                  <div className="hover-content">
                    <div className="social-box">
                      {member.linkedin && (
                        <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                          <i className="fab fa-linkedin-in" />
                        </a>
                      )}
                      {member.instagram && (
                        <a href={member.instagram} target="_blank" rel="noopener noreferrer">
                          <i className="fab fa-instagram" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="member-info">
                  <h4>
                    <a href="#">{member.name}</a>
                  </h4>
                  <span className="position">{member.position}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
