import { Header, Footer, AOSProvider } from "@/components/bizzen";
import { ThemeSwitcher } from "@/components/bizzen/ThemeSwitcher";

interface WebsiteLayoutProps {
  children: React.ReactNode;
}

export default function WebsiteLayout({ children }: WebsiteLayoutProps) {
  return (
    <AOSProvider>
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </div>
      <ThemeSwitcher />
    </AOSProvider>
  );
}
