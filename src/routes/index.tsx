import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Beaker,
  MessagesSquare,
  GraduationCap,
  Check,
  Mail,
  MessageCircle,
  Sparkles,
  Menu,
  X,
  ClipboardCheck,
  FileDown,
  Zap,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Teacher Netza Varo — Domina el inglés con un sistema moderno" },
      {
        name: "description",
        content:
          "Plataforma de inglés con Labs interactivos, Conversation Clubs y Masterclasses. Acompañamiento experto con más de 6 años de experiencia.",
      },
      { property: "og:title", content: "Teacher Netza Varo — Inglés moderno e interactivo" },
      {
        property: "og:description",
        content:
          "Aprende inglés con un sistema moderno, interactivo y a tu medida. Planes flexibles desde $150 MXN.",
      },
    ],
  }),
  component: LandingOrRedirect,
});

function LandingOrRedirect() {
  const { loading, user, profile } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to={dashboardPathFor(profile?.role) as any} />;
  return <Landing />;
}

const WA_NUMBER = "523323111642";
const WA_MESSAGE =
  "Hola Teacher Netza, me gustaría recibir más información sobre los planes de clases de inglés.";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;
const EMAIL = "teacher.netza.varo@gmail.com";

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "#examen", label: "Examen Diagnóstico" },
    { href: "#metodologia", label: "Metodología" },
    { href: "#planes", label: "Planes" },
    { href: "#contacto", label: "Contacto" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight">
              Teacher Netza Varo
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login">
              <Button size="sm" className="shadow-[var(--shadow-elegant)]">
                Iniciar Sesión
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-border/60 bg-background md:hidden">
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                <Button className="mt-2 w-full">Iniciar Sesión</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="top" className="pt-16">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-60"
            style={{ background: "var(--gradient-soft)" }}
          />
          <div
            aria-hidden
            className="absolute -top-32 left-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                +6 años formando estudiantes bilingües
              </span>
              <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Domina el inglés con un sistema{" "}
                <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                  moderno, interactivo y a tu medida
                </span>
                .
              </h1>
              <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
                Una plataforma de aprendizaje con acompañamiento experto, herramientas
                tecnológicas y práctica real para que avances con confianza desde la
                primera clase.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href="#planes">
                  <Button size="lg" className="shadow-[var(--shadow-elegant)]">
                    Ver Planes
                  </Button>
                </a>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Hablar por WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* METODOLOGÍA */}
        <section id="metodologia" className="border-t border-border/60 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Un ecosistema completo de aprendizaje
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Tres pilares diseñados para que aprendas inglés practicando, conversando y
                aplicándolo en situaciones reales.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Beaker,
                  title: "Labs Interactivos",
                  desc: "Práctica dinámica con herramientas tecnológicas que refuerzan vocabulario, gramática y comprensión.",
                  tint: "var(--gradient-violet)",
                },
                {
                  icon: MessagesSquare,
                  title: "Conversation Clubs",
                  desc: "Sesiones 100% comunicativas para perder el miedo a hablar y desarrollar fluidez real.",
                  tint: "var(--gradient-teal)",
                },
                {
                  icon: GraduationCap,
                  title: "Masterclasses",
                  desc: "Preparación enfocada en situaciones reales y objetivos específicos: viajes, entrevistas, exámenes.",
                  tint: "var(--gradient-amber)",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
                >
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-white"
                    style={{ background: f.tint }}
                  >
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold">{f.title}</h3>
                  <p className="mt-3 text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLANES */}
        <section id="planes" className="border-t border-border/60 bg-secondary/40 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Planes pensados para tu ritmo
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Empieza con clases sueltas o asegura tu progreso con un paquete mensual.
              </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
              {/* Flexible */}
              <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
                <h3 className="font-heading text-2xl font-semibold">Plan Flexible</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Para quienes quieren probar o tomar clases por hora.
                </p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-heading text-5xl font-bold">$150</span>
                  <span className="text-muted-foreground">MXN / hora</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    "Clases individuales por hora",
                    "Sin compromiso mensual",
                    "Acceso a recursos de práctica",
                    "Agenda flexible",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="mt-8 block">
                  <Button variant="outline" className="w-full">
                    Empezar Flexible
                  </Button>
                </a>
              </div>

              {/* Mensual destacado */}
              <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-[var(--shadow-elegant)]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[image:var(--gradient-primary)] px-4 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-[var(--shadow-elegant)]">
                    15% de Descuento
                  </span>
                </div>
                <h3 className="font-heading text-2xl font-semibold">Plan Mensual</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Paquetes desde 8 horas mensuales con descuento garantizado.
                </p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-heading text-5xl font-bold">8+</span>
                  <span className="text-muted-foreground">horas / mes</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    "15% de descuento sobre tarifa normal",
                    "Progreso continuo y medible",
                    "Plan de estudios personalizado",
                    "Prioridad en horarios",
                    "Acceso completo al LMS",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="mt-8 block">
                  <Button className="w-full shadow-[var(--shadow-elegant)]">
                    Aprovechar Descuento
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section id="contacto" className="border-t border-border/60 py-20 lg:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Hablemos de tus objetivos
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Escríbeme directo por WhatsApp o por correo, te respondo personalmente.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#25D366] text-white">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    WhatsApp
                  </div>
                  <div className="font-heading text-lg font-semibold">323 111 642</div>
                  <div className="text-sm text-muted-foreground">
                    Respuesta inmediata
                  </div>
                </div>
              </a>

              <a
                href={`mailto:${EMAIL}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                  <Mail className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Correo
                  </div>
                  <div className="font-heading text-base font-semibold truncate">
                    {EMAIL}
                  </div>
                  <div className="text-sm text-muted-foreground">Atención personal</div>
                </div>
              </a>
            </div>

            <div className="mt-10 flex justify-center">
              <a href={WA_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="bg-[#25D366] text-white hover:bg-[#1ebe57]"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Escribir por WhatsApp ahora
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-border/60 py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
            <div>© {new Date().getFullYear()} Teacher Netza Varo. Todos los derechos reservados.</div>
            <div className="flex items-center gap-4">
              <a href={`mailto:${EMAIL}`} className="hover:text-foreground">
                {EMAIL}
              </a>
              <Link to="/login" className="hover:text-foreground">
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </footer>
      </main>

      {/* WHATSAPP FLOATING BUTTON */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105"
      >
        <MessageCircle className="h-7 w-7" />
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-30" />
      </a>
    </div>
  );
}
