"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addExternalRater } from "@/lib/actions/cycles";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  revieweeId: z.string().min(1, "Please select an employee"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddExternalRaterDialogProps {
  cycleId: string;
  participants: Array<{
    companyUserId: string;
    companyUser: {
      user: {
        name: string | null;
        email: string;
      };
    };
  }>;
  children?: React.ReactNode;
}

export function AddExternalRaterDialog({
  cycleId,
  participants,
  children,
}: AddExternalRaterDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      revieweeId: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const result = await addExternalRater(cycleId, values);

      if (result.success) {
        toast.success("External rater added and email sent");
        form.reset();
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to add external rater");
      }
    } catch {
      toast.error("Failed to add external rater");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add External Rater
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add External Rater</DialogTitle>
          <DialogDescription>
            Add an external stakeholder (client, vendor, etc.) to provide
            feedback. They will receive an email with a unique link to submit
            their feedback.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rater Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rater Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@external-company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A feedback request will be sent to this email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="revieweeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee to Review</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {participants.map((p) => (
                        <SelectItem key={p.companyUserId} value={p.companyUserId}>
                          {p.companyUser.user.name || p.companyUser.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The employee this external rater will provide feedback for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
