import { z } from "zod";

export const authFields = ["name", "email", "password", "captcha"] as const;
export type AuthField = (typeof authFields)[number];

export type AuthFormState = {
  error: string;
  field?: AuthField;
} | null;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя"),
  email: z.email("Укажите email"),
  password: z.string().min(6, "Пароль от 6 символов"),
});

export const loginSchema = z.object({
  email: z.email("Укажите email"),
  password: z.string().min(1, "Укажите пароль"),
});

type Issue = { path: PropertyKey[]; message: string };

export function issueMessage(issues: Issue[], field: AuthField) {
  return issues.find((issue) => issue.path[0] === field)?.message ?? "";
}

export function firstFormError(issues: Issue[]): AuthFormState {
  const issue = issues[0];
  const key = String(issue?.path[0] ?? "");
  const field = authFields.find((item) => item === key);
  return { error: issue?.message || "Проверьте форму", field };
}

export function captchaError(value: string) {
  return value.trim() ? "" : "Введите код с картинки";
}

const fieldMessages: Record<string, AuthField> = {
  "Укажите имя": "name",
  "Укажите email": "email",
  "Укажите пароль": "password",
  "Пароль от 6 символов": "password",
  "Введите код с картинки": "captcha",
  "Код с картинки не совпал": "captcha",
  "Такой email уже зарегистрирован": "email",
};

export function stateFromMessage(error?: string): AuthFormState {
  if (!error) return null;
  const field = fieldMessages[error];
  return field ? { error, field } : { error };
}
