import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, LogOut } from "lucide-react";

import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "./LoginForm";
import type { LoginCredentials, RegisterCredentials } from "./types";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, register, logout } = useAuth();

  const enterApp = () => {
    void navigate({ to: "/" });
  };

  const handleLogin = async (credentials: LoginCredentials) => {
    await login(credentials);
    enterApp();
  };

  const handleRegister = async (credentials: RegisterCredentials) => {
    await register(credentials);
    enterApp();
  };

  const handleLogout = async () => {
    await logout();
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
                Inicia sesión o crea tu cuenta para buscar proveedores de forma segura.
              </p>
            </div>

            {isAuthenticated && (
              <div className="mb-5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
                <p className="font-medium">Sesión activa</p>
                <p className="mt-1 text-success/90">
                  Ya puedes entrar a ServiApp o cerrar sesión para usar otra cuenta.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <button
                    type="button"
                    onClick={enterApp}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-success px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Entrar a ServiApp
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-success/40 bg-card px-4 text-sm font-semibold text-success transition-colors hover:bg-success/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}

            {!isAuthenticated && <LoginForm onLogin={handleLogin} onRegister={handleRegister} />}

          </section>
        </div>
      </div>
    </main>
  );
}
