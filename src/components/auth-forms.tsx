"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction } from "@/actions/store";
import { CaptchaField } from "@/components/captcha-field";
import { ErrorNote } from "@/components/catalog-ui";
import { buttonClass, panelClass } from "@/components/styles";
import {
  type AuthField,
  type AuthFormState,
  captchaError,
  issueMessage,
  loginSchema,
  registerSchema,
  stateFromMessage,
} from "@/lib/auth-fields";

const levels = [
  { label: "", bar: "bg-transparent", text: "text-muted" },
  { label: "Слабый", bar: "bg-red-500", text: "text-red-700" },
  { label: "Средний", bar: "bg-amber-500", text: "text-amber-700" },
  { label: "Хороший", bar: "bg-navy", text: "text-navy" },
  { label: "Надёжный", bar: "bg-moss", text: "text-moss" },
] as const;

function fieldClass(invalid: boolean) {
  return `field mt-1 w-full border bg-white px-3 py-2 text-sm outline-none ${
    invalid ? "border-red-400 focus:border-red-500" : "border-line focus:border-navy"
  }`;
}

function passwordStrength(password: string) {
  if (!password) return 0;
  let score = 1;
  if (password.length >= 8) score += 1;
  if (/[A-Za-zА-Яа-яЁё]/.test(password) && /\d/.test(password)) score += 1;
  if (
    password.length >= 12 &&
    /[a-zа-яё]/.test(password) &&
    /[A-ZА-ЯЁ]/.test(password) &&
    /[^A-Za-zА-Яа-яЁё0-9\s]/.test(password)
  ) {
    score += 1;
  }
  return Math.min(score, 4);
}

function generatePassword() {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = lower + upper + digits + symbols;
  const length = 16;
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  const chars = [
    lower[bytes[0] % lower.length],
    upper[bytes[1] % upper.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length],
  ];
  for (let index = chars.length; index < length; index += 1) chars.push(all[bytes[index] % all.length]);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = bytes[index] % (index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
}

function useInlineErrors(state: AuthFormState) {
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({});
  const [hidden, setHidden] = useState<AuthFormState>(null);
  const server = hidden === state ? null : state;

  return {
    formError: server && !server.field ? server.error : "",
    attempt() {
      setAttempted(true);
    },
    blur(field: AuthField) {
      setTouched((current) => ({ ...current, [field]: true }));
    },
    edit(field: AuthField) {
      if (!server) return;
      if (!server.field || server.field === field) setHidden(state);
    },
    message(field: AuthField, clientMessage: string) {
      if ((attempted || touched[field]) && clientMessage) return clientMessage;
      if (server?.field === field) return server.error;
      return "";
    },
  };
}

function FieldError({ id, message }: { id: string; message: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block text-xs text-red-700">
      {message}
    </span>
  );
}

function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  value,
  error,
  onChange,
  onBlur,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  value: string;
  error: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="text-sm">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoCapitalize={type === "email" ? "none" : undefined}
        spellCheck={type === "email" ? false : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={fieldClass(Boolean(error))}
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function PasswordMeter({ password }: { password: string }) {
  const score = passwordStrength(password);
  const level = levels[score];
  return (
    <div className="mt-2">
      <div
        id="password-strength"
        role="meter"
        aria-label="Надёжность пароля"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={level.label || "Пароль не задан"}
        className="h-2 overflow-hidden rounded-full bg-line"
      >
        <div className={`h-full rounded-full transition-[width] ${level.bar}`} style={{ width: `${score * 25}%` }} />
      </div>
      {level.label ? <p className={`mt-1 text-xs ${level.text}`}>{level.label}</p> : null}
    </div>
  );
}

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action, pending] = useActionState(loginAction, stateFromMessage(initialError));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const fields = useInlineErrors(state);
  const parsed = loginSchema.safeParse({ email: email.trim(), password });
  const issues = parsed.success ? [] : parsed.error.issues;
  const emailError = fields.message("email", issueMessage(issues, "email"));
  const passwordError = fields.message("password", issueMessage(issues, "password"));

  return (
    <>
      <ErrorNote message={fields.formError} />
      <form
        noValidate
        action={action}
        className={`${panelClass} mt-4 grid gap-3`}
        onSubmit={(event) => {
          fields.attempt();
          if (!parsed.success) event.preventDefault();
        }}
      >
        <input type="hidden" name="next" value={next} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          error={emailError}
          onChange={(value) => {
            setEmail(value);
            fields.edit("email");
          }}
          onBlur={() => fields.blur("email")}
        />
        <TextField
          label="Пароль"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={passwordError}
          onChange={(value) => {
            setPassword(value);
            fields.edit("password");
          }}
          onBlur={() => fields.blur("password")}
        />
        <button className={buttonClass} disabled={pending}>
          {pending ? "Входим…" : "Войти"}
        </button>
      </form>
    </>
  );
}

export function RegisterForm({ initialError, captchaSeed }: { initialError?: string; captchaSeed: string }) {
  const [state, action, pending] = useActionState(registerAction, stateFromMessage(initialError));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [revealed, setRevealed] = useState(false);
  const fields = useInlineErrors(state);
  const parsed = registerSchema.safeParse({ name, email: email.trim(), password });
  const issues = parsed.success ? [] : parsed.error.issues;
  const nameError = fields.message("name", issueMessage(issues, "name"));
  const emailError = fields.message("email", issueMessage(issues, "email"));
  const passwordError = fields.message("password", issueMessage(issues, "password"));
  const codeError = fields.message("captcha", captchaError(captcha));
  const passwordDescribedBy = [passwordError ? "password-error" : "", "password-strength"].filter(Boolean).join(" ");

  return (
    <>
      <ErrorNote message={fields.formError} />
      <form
        noValidate
        action={action}
        className={`${panelClass} mt-4 grid gap-3`}
        onSubmit={(event) => {
          fields.attempt();
          if (!parsed.success || captchaError(captcha)) event.preventDefault();
        }}
      >
        <TextField
          label="Имя"
          name="name"
          autoComplete="name"
          value={name}
          error={nameError}
          onChange={(value) => {
            setName(value);
            fields.edit("name");
          }}
          onBlur={() => fields.blur("name")}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          error={emailError}
          onChange={(value) => {
            setEmail(value);
            fields.edit("email");
          }}
          onBlur={() => fields.blur("email")}
        />
        <div className="text-sm">
          <label htmlFor="register-password">Пароль</label>
          <span
            className={`field mt-1 flex w-full items-center gap-1 border bg-white py-1 pr-1 pl-3 ${
              passwordError ? "border-red-400 focus-within:border-red-500" : "border-line focus-within:border-navy"
            }`}
          >
            <input
              id="register-password"
              name="password"
              type={revealed ? "text" : "password"}
              value={password}
              autoComplete="new-password"
              spellCheck={false}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordDescribedBy}
              onChange={(event) => {
                setPassword(event.target.value);
                fields.edit("password");
              }}
              onBlur={() => fields.blur("password")}
              className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
            />
            <button
              type="button"
              aria-label="Сгенерировать пароль"
              className="field shrink-0 bg-paper px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-navy hover:bg-line"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setPassword(generatePassword());
                setRevealed(true);
                fields.edit("password");
              }}
            >
              Сгенерировать
            </button>
          </span>
          <PasswordMeter password={password} />
          <FieldError id="password-error" message={passwordError} />
        </div>
        <CaptchaField
          seed={captchaSeed}
          value={captcha}
          error={codeError}
          onChange={(value) => {
            setCaptcha(value);
            fields.edit("captcha");
          }}
          onBlur={() => fields.blur("captcha")}
        />
        <button className={buttonClass} disabled={pending}>
          {pending ? "Создаём аккаунт…" : "Создать аккаунт"}
        </button>
      </form>
    </>
  );
}
