import { Link, useNavigate } from "@tanstack/react-router";

import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "./LoginForm";
import type { LoginCredentials, RegisterCredentials } from "./types";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuth();

  const navigateAfterAuth = () => {
    if (typeof window === "undefined") {
      void navigate({ to: "/" });
      return;
    }

    const redirect = new URLSearchParams(window.location.search).get("redirect");

    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      window.location.assign(redirect);
      return;
    }

    void navigate({ to: "/" });
  };

  const handleLogin = async (credentials: LoginCredentials) => {
    await login(credentials);
    navigateAfterAuth();
  };

  const handleRegister = async (credentials: RegisterCredentials) => {
    await register(credentials);
    navigateAfterAuth();
  };

  return (
    <main className="flex min-h-[100dvh] bg-[image:var(--gradient-subtle)] px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-7">
            <div className="mb-7 flex items-center justify-center gap-3">
              <img
                src={logo}
                alt="ServiApp"
                className="h-11 w-11 rounded-xl object-cover shadow-[var(--shadow-elegant)]"
              />
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-tight text-foreground">ServiApp</p>
                <p className="text-sm text-muted-foreground">Servicios para el hogar</p>
              </div>
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Acceso a ServiApp
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Inicia sesion o crea tu cuenta para buscar proveedores de forma segura.
              </p>
            </div>

            {isAuthenticated && (
              <div className="mb-5 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                Ya tienes una sesion activa. Puedes volver al inicio o iniciar con otra cuenta.
              </div>
            )}

            <LoginForm onLogin={handleLogin} onRegister={handleRegister} />

            <div className="mt-6 border-t border-border pt-5 text-center">
              <Link
                to="/"
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Volver al inicio
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
