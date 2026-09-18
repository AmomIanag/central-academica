import { z } from "zod";

export const AUTH_EMAIL_MAX_LENGTH = 254;
export const AUTH_PASSWORD_MAX_LENGTH = 256;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(AUTH_EMAIL_MAX_LENGTH)
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(AUTH_PASSWORD_MAX_LENGTH),
});
