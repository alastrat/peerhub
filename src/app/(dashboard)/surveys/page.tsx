import { redirect } from "next/navigation";

// /surveys is just an index route — it always forwards to the surface that
// is actually shipped to users. The 360° module is currently hidden from
// the platform, so we land admins on the climate-survey list instead.
// Update this redirect when 360° is re-enabled.
export default function SurveysPage() {
  redirect("/surveys/climate?type=CLIMATE");
}
