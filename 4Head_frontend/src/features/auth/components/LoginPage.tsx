/* eslint-disable jsx-a11y/no-autofocus -- Email is the primary control on this dedicated keyboard-first sign-in page. */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthCard, FormStack } from "@/components/common/AuthCard";
import { FormField } from "@/components/common/FormField";
import { PageSkeleton } from "@/components/common/Skeletons";
import {
  selectIsAuthenticated,
  selectIsCheckingAuth,
} from "@/features/auth/authSlice";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useSelector } from "react-redux";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(255, "Email cannot exceed 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(255, "Password cannot exceed 255 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const { login, isLoggingIn, loginError } = useAuth();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const visibleError = loginError ? getApiErrorMessage(loginError) : null;

  if (isCheckingAuth) return <PageSkeleton rows={4} />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = (values: LoginFormValues) => {
    const handleFailure = (error: unknown) => {
      const message = getApiErrorMessage(error);
      toast.error(message);
    };

    try {
      void login(values)
        .then(() => {
          toast.success("Welcome back");
          navigate("/", { replace: true });
        })
        .catch(handleFailure);
    } catch (error) {
      handleFailure(error);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <AuthCard
        title="Sign in"
        description="Use your Poultry Business Management account."
      >
        <Form {...form}>
          <FormStack onSubmit={form.handleSubmit(onSubmit)}>
            {visibleError ? (
              <Alert variant="destructive">
                <AlertDescription>{visibleError}</AlertDescription>
              </Alert>
            ) : null}
            <FormField
              control={form.control}
              name="email"
              label="Email"
              required
            >
              {(field) => (
                <Input {...field} type="email" autoComplete="email" autoFocus />
              )}
            </FormField>
            <FormField
              control={form.control}
              name="password"
              label="Password"
              required
            >
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  autoComplete="current-password"
                />
              )}
            </FormField>
            <div className="flex justify-end">
              <Link
                className="text-sm text-primary hover:underline"
                to="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" fullWidth isLoading={isLoggingIn}>
              Sign in
            </Button>
          </FormStack>
        </Form>
      </AuthCard>
    </main>
  );
}
