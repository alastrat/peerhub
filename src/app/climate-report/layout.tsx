import type { Metadata } from "next";
import "./report.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Printable climate reports: no dashboard or portal chrome, so the page prints as is. */
export default function ClimateReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
