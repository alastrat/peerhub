"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/design-system/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createCompany } from "@/lib/actions/company";
import { toast } from "sonner";

const companySchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  slug: z
    .string()
    .min(2, "URL must be at least 2 characters")
    .max(50, "URL must be less than 50 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "URL can only contain lowercase letters, numbers, and hyphens"
    ),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: "",
      slug: "",
    },
  });

  // Auto-generate slug from company name
  const handleNameChange = (value: string) => {
    form.setValue("companyName", value);
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    form.setValue("slug", slug);
  };

  const onSubmit = async (data: CompanyFormValues) => {
    if (!session?.user?.id) {
      toast.error("Please sign in first");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCompany({
        name: data.companyName,
        slug: data.slug,
        userId: session.user.id,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to create company");
        return;
      }

      // Update session to include new company
      await update({ companyId: result.data?.company.id });

      toast.success("Company created successfully!");
      router.push("/overview");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user already has a company, redirect to overview
  if (session?.companyUser) {
    router.push("/overview");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-center border-b">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
              >
                <Building2 className="h-8 w-8 text-primary" />
              </motion.div>
              <CardTitle className="text-2xl font-bold">
                Set up your company
              </CardTitle>
              <CardDescription>
                Create your organization to get started with 360° feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Inc."
                            {...field}
                            onChange={(e) => handleNameChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company URL</FormLabel>
                        <FormControl>
                          <div className="flex items-center rounded-lg border border-input bg-background shadow-sm">
                            <span className="px-3 text-sm text-muted-foreground">
                              peerhub.com/
                            </span>
                            <Input
                              className="border-0 shadow-none"
                              placeholder="acme"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          This will be your unique company identifier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Create Company
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
