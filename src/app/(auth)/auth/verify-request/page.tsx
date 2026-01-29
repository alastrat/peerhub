import { Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyRequestPage() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
        <CardDescription>
          We sent you a sign-in link. Click the link in the email to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive the email? Check your spam folder or try signing in
          again.
        </p>
      </CardContent>
    </Card>
  );
}
