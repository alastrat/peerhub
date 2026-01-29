"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Users,
  Settings,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { createCycleSchema, type CreateCycleInput } from "@/lib/validations/cycle";
import { createCycle } from "@/lib/actions/cycles";
import { getInitials } from "@/lib/utils/formatting";
import type { Template, CompanyUser, User } from "@prisma/client";

type CompanyUserWithUser = CompanyUser & { user: User };

interface CycleWizardProps {
  templates: Template[];
  employees: CompanyUserWithUser[];
}

type WizardStep = "basics" | "settings" | "participants" | "review";

const STEPS: { id: WizardStep; title: string; icon: React.ElementType }[] = [
  { id: "basics", title: "Basics", icon: Calendar },
  { id: "settings", title: "Settings", icon: Settings },
  { id: "participants", title: "Participants", icon: Users },
  { id: "review", title: "Review", icon: Check },
];

export function CycleWizard({ templates, employees }: CycleWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<WizardStep>("basics");

  // Calculate default dates
  const today = new Date();
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14);
  const fourWeeksFromNow = new Date(today);
  fourWeeksFromNow.setDate(today.getDate() + 28);

  const form = useForm<CreateCycleInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createCycleSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      templateId: "",
      reviewStartDate: twoWeeksFromNow,
      reviewEndDate: fourWeeksFromNow,
      selfReviewEnabled: true,
      managerReviewEnabled: true,
      peerReviewEnabled: true,
      directReportEnabled: false,
      externalEnabled: false,
      minPeers: 3,
      maxPeers: 8,
      anonymityThreshold: 3,
      employeeNominatePeers: true,
      managerApprovePeers: true,
      participantIds: [],
    },
  });

  const participantIds = form.watch("participantIds") || [];
  const selectedTemplate = templates.find((t) => t.id === form.watch("templateId"));

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  function goNext() {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }

  function goPrev() {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }

  async function validateCurrentStep(): Promise<boolean> {
    let fields: (keyof CreateCycleInput)[] = [];

    switch (currentStep) {
      case "basics":
        fields = ["name", "templateId", "reviewStartDate", "reviewEndDate"];
        break;
      case "settings":
        fields = ["minPeers", "maxPeers", "anonymityThreshold"];
        break;
      case "participants":
        // Participants are optional, no validation needed
        return true;
      case "review":
        // Final step, no validation needed before submission
        return true;
    }

    const result = await form.trigger(fields);
    return result;
  }

  async function handleNext() {
    const isValid = await validateCurrentStep();
    if (isValid) {
      goNext();
    }
  }

  function onSubmit(data: CreateCycleInput) {
    startTransition(async () => {
      const result = await createCycle({
        ...data,
        reviewStartDate: new Date(data.reviewStartDate),
        reviewEndDate: new Date(data.reviewEndDate),
      });

      if (result.success) {
        toast.success("Cycle created successfully");
        router.push(`/cycles/${result.data?.id}`);
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    });
  }

  function toggleParticipant(userId: string) {
    const current = form.getValues("participantIds") || [];
    if (current.includes(userId)) {
      form.setValue(
        "participantIds",
        current.filter((id) => id !== userId)
      );
    } else {
      form.setValue("participantIds", [...current, userId]);
    }
  }

  function selectAllParticipants() {
    form.setValue(
      "participantIds",
      employees.map((e) => e.id)
    );
  }

  function clearAllParticipants() {
    form.setValue("participantIds", []);
  }

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="flex items-center justify-center">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (index < currentStepIndex) {
                  setCurrentStep(step.id);
                }
              }}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 transition-colors",
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : index < currentStepIndex
                  ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <step.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.title}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 mx-2",
                  index < currentStepIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: Basics */}
          {currentStep === "basics" && (
            <Card>
              <CardHeader>
                <CardTitle>Cycle Basics</CardTitle>
                <CardDescription>
                  Set up the basic information for your review cycle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Q1 2025 Performance Review" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Quarterly performance review for all team members..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Template</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The template determines the questions used in reviews
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="reviewStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split("T")[0]
                                : field.value
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reviewEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split("T")[0]
                                : field.value
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Settings */}
          {currentStep === "settings" && (
            <Card>
              <CardHeader>
                <CardTitle>Review Settings</CardTitle>
                <CardDescription>
                  Configure reviewer types and peer settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Reviewer Types */}
                <div className="space-y-4">
                  <h3 className="font-medium">Reviewer Types</h3>
                  <p className="text-sm text-muted-foreground">
                    Select which types of reviewers will participate in this cycle
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="selfReviewEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Self Review</FormLabel>
                            <FormDescription>
                              Employees review themselves
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="managerReviewEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Manager Review</FormLabel>
                            <FormDescription>
                              Managers review their reports
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="peerReviewEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Peer Review</FormLabel>
                            <FormDescription>
                              Colleagues review each other
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="directReportEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Upward Review</FormLabel>
                            <FormDescription>
                              Reports review their managers
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Peer Settings */}
                {form.watch("peerReviewEnabled") && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Peer Review Settings</h3>

                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="minPeers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Peer Nominations</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              Minimum peers each employee must nominate
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxPeers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Peer Nominations</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum peers each employee can nominate
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="employeeNominatePeers"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Employee Nominates Peers</FormLabel>
                              <FormDescription>
                                Allow employees to suggest their peer reviewers
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="managerApprovePeers"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Manager Approves Peers</FormLabel>
                              <FormDescription>
                                Require manager approval for peer nominations
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Anonymity */}
                <div className="space-y-4">
                  <h3 className="font-medium">Anonymity Settings</h3>
                  <FormField
                    control={form.control}
                    name="anonymityThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Anonymity Threshold: {field.value} reviewers
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            value={[field.value]}
                            onValueChange={(v) => field.onChange(v[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormDescription>
                          Feedback from a reviewer group will only be shown if at
                          least this many responses are received. This protects
                          individual anonymity.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Participants */}
          {currentStep === "participants" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Select Participants</CardTitle>
                    <CardDescription>
                      Choose which employees will be reviewed in this cycle
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllParticipants}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllParticipants}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Badge variant="secondary">
                    {participantIds.length} of {employees.length} selected
                  </Badge>
                </div>

                <ScrollArea className="h-96 rounded border p-4">
                  <div className="space-y-2">
                    {employees.map((employee) => {
                      const isSelected = participantIds.includes(employee.id);
                      return (
                        <div
                          key={employee.id}
                          onClick={() => toggleParticipant(employee.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                            isSelected
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted"
                          )}
                        >
                          <Checkbox checked={isSelected} />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={employee.user.image || undefined} />
                            <AvatarFallback>
                              {employee.user.name
                                ? getInitials(employee.user.name)
                                : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {employee.user.name || employee.user.email}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {employee.title || "No title"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {currentStep === "review" && (
            <Card>
              <CardHeader>
                <CardTitle>Review Your Cycle</CardTitle>
                <CardDescription>
                  Confirm the details before creating your review cycle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="font-medium">Basics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">
                          {form.getValues("name") || "Not set"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Template</span>
                        <span className="font-medium">
                          {selectedTemplate?.name || "Not set"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date</span>
                        <span className="font-medium">
                          {new Date(
                            form.getValues("reviewStartDate")
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date</span>
                        <span className="font-medium">
                          {new Date(
                            form.getValues("reviewEndDate")
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Reviewer Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {form.getValues("selfReviewEnabled") && (
                        <Badge>Self Review</Badge>
                      )}
                      {form.getValues("managerReviewEnabled") && (
                        <Badge>Manager Review</Badge>
                      )}
                      {form.getValues("peerReviewEnabled") && (
                        <Badge>Peer Review</Badge>
                      )}
                      {form.getValues("directReportEnabled") && (
                        <Badge>Upward Review</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Participants</h3>
                  <div className="flex flex-wrap gap-2">
                    {participantIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No participants selected. You can add them later.
                      </p>
                    ) : (
                      <Badge variant="secondary">
                        {participantIds.length} participant
                        {participantIds.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>

                {form.getValues("peerReviewEnabled") && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Peer Settings</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Peer Nominations
                        </span>
                        <span className="font-medium">
                          {form.getValues("minPeers")} - {form.getValues("maxPeers")}{" "}
                          peers
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Anonymity Threshold
                        </span>
                        <span className="font-medium">
                          {form.getValues("anonymityThreshold")} reviewers
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={goPrev}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep !== "review" ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Cycle
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
