import { Header, Footer } from "@/components/kultiva/layout";

interface WebsiteLayoutProps {
  children: React.ReactNode;
}

export default function WebsiteLayout({ children }: WebsiteLayoutProps) {
  return (
    <div className="kultiva-site min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
