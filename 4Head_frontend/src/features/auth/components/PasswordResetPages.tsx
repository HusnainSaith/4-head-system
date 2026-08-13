import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AuthCard, FormStack } from "@/components/common/AuthCard";
import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from "@/features/auth/authApi";
import { getApiErrorMessage } from "@/lib/api-error";

const forgotSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
});

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/\d/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      {children}
    </main>
  );
}

export function ForgotPasswordPage() {
  const [requestReset, requestState] = useForgotPasswordMutation();
  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });
  return (
    <AuthPage>
      <AuthCard
        title="Reset password"
        description="We will email a secure link if the account exists."
      >
        <Form {...form}>
          <FormStack
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await requestReset(values).unwrap();
                toast.success("Check your email for a password reset link");
              } catch (error) {
                toast.error(getApiErrorMessage(error));
              }
            })}
          >
            <FormField
              control={form.control}
              name="email"
              label="Email"
              required
            >
              {(field) => (
                <Input {...field} type="email" autoComplete="email" />
              )}
            </FormField>
            <Button type="submit" fullWidth isLoading={requestState.isLoading}>
              Send reset link
            </Button>
            <Button asChild variant="link" fullWidth>
              <Link to="/login">Back to sign in</Link>
            </Button>
          </FormStack>
        </Form>
      </AuthCard>
    </AuthPage>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [resetPassword, resetState] = useResetPasswordMutation();
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  return (
    <AuthPage>
      <AuthCard
        title="Choose a new password"
        description="The reset link is valid for one hour."
      >
        {token ? (
          <Form {...form}>
            <FormStack
              onSubmit={form.handleSubmit(async ({ password }) => {
                try {
                  await resetPassword({ token, password }).unwrap();
                  toast.success(
                    "Password changed. Sign in with your new password.",
                  );
                  navigate("/login", { replace: true });
                } catch (error) {
                  toast.error(getApiErrorMessage(error));
                }
              })}
            >
              <FormField
                control={form.control}
                name="password"
                label="New password"
                required
              >
                {(field) => (
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </FormField>
              <FormField
                control={form.control}
                name="confirmPassword"
                label="Confirm password"
                required
              >
                {(field) => (
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </FormField>
              <Button type="submit" fullWidth isLoading={resetState.isLoading}>
                Change password
              </Button>
            </FormStack>
          </Form>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-destructive">
              This reset link is missing its token.
            </p>
            <Button asChild fullWidth>
              <Link to="/forgot-password">Request another link</Link>
            </Button>
          </div>
        )}
      </AuthCard>
    </AuthPage>
  );
}
