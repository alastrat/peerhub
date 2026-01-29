import { Logo } from "@/components/design-system/logo";

export default function ExternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <Logo />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t bg-background py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by Kultiva - 360° Performance Feedback Platform</p>
        </div>
      </footer>
    </div>
  );
}
