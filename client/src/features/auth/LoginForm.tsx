import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginCredentials, RegisterCredentials } from "./types";

interface LoginFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

interface LoginFormProps {
  onLogin?: (credentials: LoginCredentials) => Promise<void> | void;
  onRegister?: (credentials: RegisterCredentials) => Promise<void> | void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type AuthMode = "login" | "register";

function getAuthErrorMessage(error: unknown, mode: AuthMode) {
  const response = (error as { response?: { status?: number; data?: { detail?: string } } })
    .response;
  const status = response?.status;
  const detail = response?.data?.detail;

  if (status === 409) {
    return "Ese correo ya esta registrado. Intenta iniciar sesion.";
  }

  if (status === 401) {
    return "Correo o contrasena incorrectos.";
  }

  if (status === 403) {
    return "La cuenta esta desactivada.";
  }

  if (status === 422) {
    return "Revisa que el correo y la contrasena tengan un formato valido.";
  }

  if (status && status >= 500) {
    return "El servidor no pudo completar la solicitud. Revisa que la base de datos este inicializada.";
  }

  if (detail) {
    return detail;
  }

  return mode === "register"
    ? "No pudimos crear tu cuenta. Revisa tus datos e intenta de nuevo."
    : "No pudimos iniciar sesion. Revisa tus datos e intenta de nuevo.";
}

function validateAuth(
  credentials: LoginCredentials,
  mode: AuthMode,
  confirmPassword: string,
): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!credentials.email.trim()) {
    errors.email = "Ingresa tu correo electronico.";
  } else if (!EMAIL_PATTERN.test(credentials.email.trim())) {
    errors.email = "Ingresa un correo electronico valido.";
  }

  if (!credentials.password) {
    errors.password = "Ingresa tu contrasena.";
  } else if (mode === "register" && credentials.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (mode === "register") {
    if (!confirmPassword) {
      errors.confirmPassword = "Confirma tu contrasena.";
    } else if (confirmPassword !== credentials.password) {
      errors.confirmPassword = "Las contrasenas no coinciden.";
    }
  }

  return errors;
}

export function LoginForm({ onLogin, onRegister }: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof LoginCredentials, value: string) => {
    setCredentials((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrors({});
    setConfirmPassword("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextCredentials = {
      email: credentials.email.trim(),
      password: credentials.password,
    };
    const validationErrors = validateAuth(nextCredentials, mode, confirmPassword);

    if (
      validationErrors.email ||
      validationErrors.password ||
      validationErrors.confirmPassword
    ) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (mode === "register" && onRegister) {
        await onRegister(nextCredentials);
      } else if (onLogin) {
        await onLogin(nextCredentials);
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
      }
    } catch (error) {
      setErrors({
        form: getAuthErrorMessage(error, mode),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
            mode === "login"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Iniciar sesion
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
            mode === "register"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      {errors.form && (
        <div
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Correo electronico</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="tu@correo.com"
            value={credentials.email}
            onChange={(event) => updateField("email", event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-12 rounded-xl bg-card pl-10 text-base"
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contrasena</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            placeholder="Ingresa tu contrasena"
            value={credentials.password}
            onChange={(event) => updateField("password", event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="h-12 rounded-xl bg-card pl-10 text-base"
          />
        </div>
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password}
          </p>
        )}
      </div>

      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar contrasena</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repite tu contrasena"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  confirmPassword: undefined,
                  form: undefined,
                }));
              }}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              className="h-12 rounded-xl bg-card pl-10 text-base"
            />
          </div>
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="text-sm text-destructive">
              {errors.confirmPassword}
            </p>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-[image:var(--gradient-primary)] text-base font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === "register" ? "Creando cuenta" : "Iniciando sesion"}
          </>
        ) : (
          mode === "register" ? "Crear cuenta" : "Iniciar sesion"
        )}
      </Button>
    </form>
  );
}
