import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
        <div className="hidden lg:block">
          <img src="/logo_teacher_netza.png" alt="Teacher Netza" className="mb-6 h-24 w-24 object-contain" />
          <h1 className="font-heading text-5xl font-bold leading-tight text-foreground">
            Teacher <span className="text-primary">Netza Varo</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Accede a tus cursos, actividades asignadas, retroalimentación y comunicación directa dentro de la plataforma.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />Cursos y actividades por nivel</div>
            <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />Retroalimentación del teacher</div>
            <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />Seguimiento de progreso</div>
          </div>
        </div>

        <Card className="border-border/60 p-8 shadow-[var(--shadow-elegant)]">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <img src="/icono_teacher_netza.png" alt="Teacher Netza" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-heading text-lg font-bold">Teacher Netza</p>
              <p className="text-xs text-muted-foreground">Bienvenido</p>
            </div>
          </div>

          <h2 className="font-heading text-2xl font-bold">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Usa las credenciales que te fueron asignadas.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
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
              Entrar
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Si no tienes acceso, solicítalo directamente a Teacher Netza.
          </p>
        </Card>
      </div>
    </div>
  );
}
