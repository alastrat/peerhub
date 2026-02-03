import { Header, Footer, AOSProvider } from "@/components/bizzen";

interface WebsiteLayoutProps {
  children: React.ReactNode;
}

export default function WebsiteLayout({ children }: WebsiteLayoutProps) {
  return (
    <AOSProvider>
      {/* Smooth Wrapper - matches template structure */}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </div>
    </AOSProvider>
  );
}
