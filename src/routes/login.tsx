import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      navigate({ to: dashboardPathFor(profile.role) as any });
    }
  }, [loading, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) toast.error(error);
    else toast.success("Welcome back!");
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        {/* Hero */}
        <div className="hidden lg:block">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-5xl font-bold leading-tight text-foreground">
            Welcome to <span className="text-primary">Rators Academy</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Your home for focused, modern learning. Sign in to continue your courses, track your progress, and connect with your instructors.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />Personalized course progress</div>
            <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />Live feedback from instructors</div>
            <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />A clean, distraction-free workspace</div>
          </div>
        </div>

        {/* Card */}
        <Card className="border-border/60 p-8 shadow-[var(--shadow-elegant)]">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-lg font-bold">Rators Academy</p>
              <p className="text-xs text-muted-foreground">Welcome back</p>
            </div>
          </div>

          <h2 className="font-heading text-2xl font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your student account to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ratorsacademy.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs">
            <p className="mb-2 font-semibold text-foreground">Demo accounts</p>
            <div className="space-y-1.5 text-muted-foreground">
              {[
                { label: "Admin", e: "admin@ratorsacademy.com", p: "Admin1234!" },
                { label: "Teacher", e: "teacher@ratorsacademy.com", p: "Teacher1234!" },
                { label: "Student", e: "student@ratorsacademy.com", p: "Student1234!" },
              ].map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => { setEmail(d.e); setPassword(d.p); }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-accent/50 transition-colors"
                >
                  <span className="font-medium text-foreground">{d.label}</span>
                  <span className="font-mono text-[10px]">{d.e}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Instructors and administrators can also sign in here.
          </p>
        </Card>
      </div>
    </div>
  );
}
