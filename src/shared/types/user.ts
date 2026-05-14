import { z } from 'zod'

export const UserRoleSchema = z.enum(['admin', 'normal', 'guest'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const AuthProviderSchema = z.enum(['credentials', 'google', 'github', 'guest'])
export type AuthProvider = z.infer<typeof AuthProviderSchema>

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  passwordHash: z.string().optional(),
  role: UserRoleSchema,
  provider: AuthProviderSchema,
  createdAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
})
export type User = z.infer<typeof UserSchema>

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8).optional(),
  role: UserRoleSchema.default('normal'),
  provider: AuthProviderSchema.default('credentials'),
})
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>

export const PublicUserSchema = UserSchema.omit({ passwordHash: true })
export type PublicUser = z.infer<typeof PublicUserSchema>
