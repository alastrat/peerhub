import { Header, Footer } from "@/components/bizzen";
import { ThemeSwitcher } from "@/components/bizzen/ThemeSwitcher";

interface WebsiteLayoutProps {
  children: React.ReactNode;
}

export default function WebsiteLayout({ children }: WebsiteLayoutProps) {
  return (
    <>
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </div>
      <ThemeSwitcher />
    </>
  );
}
