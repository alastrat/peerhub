"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const STEPS = ["1", "2", "3"] as const;
const MODULE_OPTIONS = [
  "feedback360",
  "climate",
  "people",
  "org",
  "all",
] as const;

export function DemoRequestSection() {
  const t = useTranslations("demo.form");
  const tExpect = useTranslations("demo.expect");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      company: data.get("company"),
      role: data.get("role"),
      employees: data.get("employees"),
      modules: data.getAll("modules"),
      message: data.get("message"),
    };

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("submit_failed");
      setSubmitted(true);
      form.reset();
    } catch {
      setError(t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="demo-request" style={{ padding: "100px 0", backgroundColor: "#fff" }}>
      <div className="container">
        <div className="row">
          {/* Form column */}
          <div className="col-lg-7">
            <div
              style={{
                backgroundColor: "#f8f9fc",
                borderRadius: "20px",
                padding: "40px",
                border: "1px solid #eee",
              }}
            >
              <h3
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#1a1a2e",
                  marginBottom: "24px",
                }}
              >
                {t("title")}
              </h3>

              {submitted ? (
                <div
                  style={{
                    padding: "32px",
                    backgroundColor: "#dcfce7",
                    borderRadius: "12px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "24px",
                      marginBottom: "16px",
                    }}
                  >
                    <i className="fas fa-check" />
                  </div>
                  <h4 style={{ color: "#166534", fontSize: "20px", marginBottom: "8px" }}>
                    {t("success_title")}
                  </h4>
                  <p style={{ color: "#15803d", margin: 0 }}>{t("success_message")}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#444",
                            marginBottom: "6px",
                          }}
                        >
                          {t("name_label")} *
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          className="form_control"
                          placeholder={t("name_placeholder")}
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#444",
                            marginBottom: "6px",
                          }}
                        >
                          {t("email_label")} *
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          className="form_control"
                          placeholder={t("email_placeholder")}
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#444",
                            marginBottom: "6px",
                          }}
                        >
                          {t("company_label")} *
                        </label>
                        <input
                          type="text"
                          name="company"
                          required
                          className="form_control"
                          placeholder={t("company_placeholder")}
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#444",
                            marginBottom: "6px",
                          }}
                        >
                          {t("role_label")} *
                        </label>
                        <input
                          type="text"
                          name="role"
                          required
                          className="form_control"
                          placeholder={t("role_placeholder")}
                        />
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#444",
                            marginBottom: "6px",
                          }}
                        >
                          {t("employees_label")} *
                        </label>
                        <select
                          name="employees"
                          required
                          className="form_control"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            {t("employees_placeholder")}
                          </option>
                          <option value="1-50">1-50</option>
                          <option value="51-200">51-200</option>
                          <option value="201-500">201-500</option>
                          <option value="500+">500+</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#444",
                            marginBottom: "10px",
                          }}
                        >
                          {t("modules_label")}
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                          {MODULE_OPTIONS.map((opt) => (
                            <label
                              key={opt}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "6px 14px",
                                borderRadius: "20px",
                                backgroundColor: "#fff",
                                border: "1px solid #ddd",
                                cursor: "pointer",
                                fontSize: "14px",
                              }}
                            >
                              <input type="checkbox" name="modules" value={opt} />
                              {t(`modules.${opt}`)}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#444",
                            marginBottom: "6px",
                          }}
                        >
                          {t("message_label")}
                        </label>
                        <textarea
                          name="message"
                          rows={3}
                          className="form_control"
                          placeholder={t("message_placeholder")}
                        />
                      </div>
                    </div>
                    {error && (
                      <div className="col-lg-12">
                        <p style={{ color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>
                          {error}
                        </p>
                      </div>
                    )}
                    <div className="col-lg-12">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="theme-btn style-one"
                        style={{ width: "100%", padding: "14px", fontSize: "15px" }}
                      >
                        {submitting ? t("submitting") : t("submit")}
                        <i className="far fa-arrow-right" style={{ marginLeft: "8px" }} />
                      </button>
                      <p
                        style={{
                          marginTop: "12px",
                          fontSize: "13px",
                          color: "#888",
                          textAlign: "center",
                        }}
                      >
                        {t("disclaimer")}
                      </p>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* What to expect column */}
          <div className="col-lg-5">
            <div style={{ padding: "40px 24px" }}>
              <h3
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#1a1a2e",
                  marginBottom: "32px",
                }}
              >
                {tExpect("title")}
              </h3>

              {STEPS.map((step) => (
                <div
                  key={step}
                  style={{
                    display: "flex",
                    gap: "16px",
                    marginBottom: "24px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "var(--btn-primary-bg)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {step}
                  </div>
                  <div>
                    <h5 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a2e", marginBottom: "6px" }}>
                      {tExpect(`steps.${step}.title`)}
                    </h5>
                    <p style={{ color: "#666", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                      {tExpect(`steps.${step}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
