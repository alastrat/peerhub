import { Logo } from "@/components/design-system/logo";
import { getPlatformTheme } from "@/lib/queries/platform-theme";

export default async function ExternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The Kultiva theme puts this header on the purple backdrop.
  const platformTheme = await getPlatformTheme();

  return (
    <div data-app-shell="external" className="min-h-screen bg-muted/30">
      <header data-app-header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <Logo variant={platformTheme === "kultiva" ? "white" : "color"} />
        </div>
      </header>
      <main data-app-main className="container mx-auto px-4 py-8">{children}</main>
      <footer data-app-footer className="border-t bg-background py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by Kultiva - 360° Performance Feedback Platform</p>
        </div>
      </footer>
    </div>
  );
}
