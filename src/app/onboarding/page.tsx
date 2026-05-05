"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Building2, Check, Loader2, UserCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
import {
  createCompany,
  getAvailableCompanies,
  switchCompany,
} from "@/lib/actions/company";
import {
  getPersonalInfo,
  updatePersonalInfo,
} from "@/lib/actions/platform";
import { toast } from "sonner";

const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number with country code")
    .optional()
    .or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
});

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

type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;
type CompanyFormValues = z.infer<typeof companySchema>;

type Step = "profile" | "company";

function splitName(name: string | null | undefined): { firstName: string; lastName: string } {
  if (!name) return { firstName: "", lastName: "" };
  const trimmed = name.trim();
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1).trim(),
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [step, setStep] = useState<Step>("profile");
  const [checking, setChecking] = useState(true);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

  const profileForm = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", jobTitle: "" },
  });

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: "", slug: "" },
  });

  useEffect(() => {
    if (!session?.user?.id) return;
    if (session.companyUser) {
      window.location.assign("/overview");
      return;
    }

    let cancelled = false;
    (async () => {
      // Decide which step to start on by combining DB + Google fallback.
      const [info, companies] = await Promise.all([
        getPersonalInfo(),
        getAvailableCompanies(),
      ]);
      if (cancelled) return;

      const stored = info.success ? info.data : null;
      const fromGoogle = splitName(session.user?.name ?? null);

      const firstName = stored?.firstName ?? fromGoogle.firstName ?? "";
      const lastName = stored?.lastName ?? fromGoogle.lastName ?? "";

      profileForm.reset({
        firstName,
        lastName,
        phone: stored?.phone ?? "",
        jobTitle: stored?.jobTitle ?? "",
      });

      if (companies.length > 0) {
        // Returning user with at least one company — bypass everything.
        await switchCompany(companies[0].companyId);
        await update({ companyId: companies[0].companyId });
        window.location.assign("/overview");
        return;
      }

      // First-time user. Skip step 1 only if both name fields are already
      // saved on the User row (Google may have populated them via NextAuth's
      // createUser event in the future, but today they'd still be empty for
      // most accounts).
      if (stored?.firstName && stored?.lastName) {
        setStep("company");
      }
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.companyUser, profileForm, update]);

  const onSubmitProfile = async (data: PersonalInfoFormValues) => {
    setIsSubmittingProfile(true);
    try {
      const result = await updatePersonalInfo(data);
      if (!result.success) {
        toast.error(result.error || "Failed to save personal info");
        return;
      }
      // Refresh session so session.user.name reflects the new value.
      await update({ refreshProfile: true });
      setStep("company");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleCompanyNameChange = (value: string) => {
    companyForm.setValue("companyName", value);
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    companyForm.setValue("slug", slug);
  };

  const onSubmitCompany = async (data: CompanyFormValues) => {
    if (!session?.user?.id) {
      toast.error("Please sign in first");
      return;
    }

    setIsSubmittingCompany(true);
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

      await update({ companyId: result.data?.company.id });

      toast.success("Company created successfully!");
      window.location.assign("/overview");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  if (session?.companyUser || checking) {
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
            {step === "profile" ? (
              <>
                <CardHeader className="space-y-1 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
                  >
                    <UserCircle2 className="h-8 w-8 text-primary" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold">
                    Tell us about yourself
                  </CardTitle>
                  <CardDescription>
                    A few details to personalize your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form
                      onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First name</FormLabel>
                              <FormControl>
                                <Input placeholder="Jane" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last name</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (optional)</FormLabel>
                            <FormControl>
                              <PhoneInput
                                international
                                defaultCountry="CO"
                                value={field.value || undefined}
                                onChange={(v) => field.onChange(v ?? "")}
                                className="phone-input"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="jobTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job title (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="People Operations Lead"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmittingProfile}
                      >
                        {isSubmittingProfile ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Continue
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </>
            ) : (
              <>
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
                  <Form {...companyForm}>
                    <form
                      onSubmit={companyForm.handleSubmit(onSubmitCompany)}
                      className="space-y-4"
                    >
                      <FormField
                        control={companyForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Acme Inc."
                                {...field}
                                onChange={(e) =>
                                  handleCompanyNameChange(e.target.value)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={companyForm.control}
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

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setStep("profile")}
                          disabled={isSubmittingCompany}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={isSubmittingCompany}
                        >
                          {isSubmittingCompany ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Create Company
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
