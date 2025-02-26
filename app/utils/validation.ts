import { z } from 'zod'

export const NonEmptyString = z.string().trim().min(1)

export const UserEmailSchema = z
  .string({ required_error: 'Email is required' })
  .email({ message: 'Invalid email' })
  .min(3, { message: 'Email is too short' })
  .max(70, { message: 'Email is too long' })
  .transform(val => val.toLowerCase())

export const UsernameSchema = z
  .string({ required_error: 'Username is required' })
  .min(3, { message: 'Username is too short' })
  .max(20, { message: 'Username is too long' })

export const PasswordSchema = z
  .string({ required_error: 'Password is required' })
  .min(6, { message: 'Password is too short' })
  .refine(val => new TextEncoder().encode(val).length <= 72, {
    message: 'Password is too long',
  })

export const PasswordAndConfirmPasswordSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: 'custom',
        message: 'The passwords must match',
      })
    }
  })

export const VerifyCodeSchema = z
  .string()
  .length(6, { message: 'The code must have 6 characters' })
