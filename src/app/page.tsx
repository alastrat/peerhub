import Link from "next/link";
import { ArrowRight, BarChart3, Shield, Users, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/design-system/logo";

const features = [
  {
    icon: Users,
    title: "Multi-Rater Feedback",
    description:
      "Collect comprehensive feedback from managers, peers, direct reports, and external stakeholders.",
  },
  {
    icon: Shield,
    title: "Anonymous & Secure",
    description:
      "Built-in anonymity thresholds ensure honest feedback while protecting respondent privacy.",
  },
  {
    icon: BarChart3,
    title: "Actionable Insights",
    description:
      "Clear visualizations and aggregated reports help identify strengths and growth areas.",
  },
  {
    icon: Zap,
    title: "Simple Setup",
    description:
      "Get started in minutes with intuitive templates and guided onboarding.",
  },
];

const benefits = [
  "Unlimited review cycles",
  "Custom rating templates",
  "Peer nomination workflow",
  "Anonymous feedback collection",
  "Manager approval process",
  "Individual development reports",
  "CSV import & export",
  "Email notifications",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-wide flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="container-wide">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-5xl font-black tracking-tight lg:text-7xl">
                360° Feedback
                <br />
                <span className="text-gradient">Made Simple</span>
              </h1>
              <p className="mb-8 text-lg text-muted-foreground lg:text-xl">
                Empower your team with comprehensive performance feedback. Collect
                insights from every angle, drive growth, and build a culture of
                continuous improvement.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup">
                  <Button size="xl" className="gap-2">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button size="xl" variant="outline">
                    See How It Works
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required • Free for teams up to 10
              </p>
            </div>
          </div>

          {/* Background gradient */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t bg-muted/30 py-24">
          <div className="container-wide">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl">
                Everything you need for 360° reviews
              </h2>
              <p className="text-muted-foreground">
                A complete platform for collecting, managing, and analyzing
                multi-rater feedback.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24">
          <div className="container-wide">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl">
                  Built for growing teams
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Whether you&apos;re a startup or scaling company, Kultiva adapts to
                  your feedback culture and helps you build a high-performing team.
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-video rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-8">
                  <div className="flex h-full flex-col justify-between rounded-lg border bg-card p-6 shadow-lg">
                    <div className="space-y-2">
                      <div className="h-3 w-24 rounded bg-muted" />
                      <div className="h-2 w-32 rounded bg-muted/60" />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex gap-2">
                        <div className="h-16 w-8 rounded bg-primary/20" />
                        <div className="h-24 w-8 rounded bg-primary/40" />
                        <div className="h-20 w-8 rounded bg-primary/30" />
                        <div className="h-28 w-8 rounded bg-primary" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">4.2</div>
                        <div className="text-xs text-muted-foreground">
                          avg. rating
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-primary py-24 text-primary-foreground">
          <div className="container-wide text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl">
              Ready to transform your feedback culture?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl opacity-90">
              Join hundreds of companies using Kultiva to build stronger teams
              through meaningful feedback.
            </p>
            <Link href="/signup">
              <Button size="xl" variant="secondary" className="gap-2">
                Get Started for Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container-wide">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <Logo />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Kultiva. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
