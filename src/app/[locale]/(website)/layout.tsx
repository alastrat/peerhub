import { Header, Footer } from "@/components/bizzen";
import { ThemeSwitcher } from "@/components/bizzen/ThemeSwitcher";

interface WebsiteLayoutProps {
  children: React.ReactNode;
}

export default function WebsiteLayout({ children }: WebsiteLayoutProps) {
  return (
    // data-website: Bootstrap's and bizzen's class rules only apply inside it
    // (scripts/scope-website-css.mjs), so they don't override Tailwind in the app.
    <div data-website>
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </div>
      <ThemeSwitcher />
    </div>
  );
}
