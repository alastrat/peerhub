"use client";

import { useTranslations } from "next-intl";
import type { ResolvedTeamMember } from "@/lib/sanity";
import { getImageUrl } from "@/lib/sanity";

// Fallback image
const fallbackImage = "/images/team/iskya-speaking.jpg";

interface TeamSectionProps {
  teamMembers?: ResolvedTeamMember[];
}

export function TeamSection({ teamMembers = [] }: TeamSectionProps) {
  const t = useTranslations("about.team");

  // Map Sanity team members to component format
  const team = teamMembers.map((m, index) => ({
    name: m.name || "",
    position: m.role || "",
    // Portrait aspect (2:3) preserves head + torso instead of center-cropping to a square
    image: m.image ? getImageUrl(m.image, { width: 400, height: 600, fit: "crop" }) : fallbackImage,
    linkedin: m.socialLinks?.linkedin,
    twitter: m.socialLinks?.twitter,
    email: m.socialLinks?.email,
    duration: 800 + index * 200,
  }));

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
                <div className="member-image" style={{ aspectRatio: "2 / 3", overflow: "hidden" }}>
                  <img
                    src={member.image || ""}
                    alt={member.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                  />
                  <div className="hover-content">
                    <div className="social-box">
                      {member.linkedin && (
                        <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                          <i className="fab fa-linkedin-in" />
                        </a>
                      )}
                      {member.twitter && (
                        <a href={member.twitter} target="_blank" rel="noopener noreferrer">
                          <i className="fab fa-twitter" />
                        </a>
                      )}
                      {member.email && (
                        <a href={`mailto:${member.email}`}>
                          <i className="fas fa-envelope" />
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
