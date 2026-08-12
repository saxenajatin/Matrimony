import { z } from "zod";

/** Username may be a short handle or an email-style login. */
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(64, "Username must be at most 64 characters")
  .regex(
    /^[a-z0-9._@+-]+$/,
    "Username may only contain letters, numbers, and . _ @ + -",
  );

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    email: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || z.string().email().safeParse(value).success,
        "Enter a valid email address",
      ),
    acceptTerms: z.boolean().refine((value) => value, {
      message: "You must accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  username: usernameSchema,
});

export const resetPasswordSchema = z
  .object({
    username: usernameSchema,
    currentPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
