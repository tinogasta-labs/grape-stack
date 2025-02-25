import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test'] as const),
})

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

export function initEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    // biome-ignore lint/suspicious/noConsole: log environment variables error.
    console.error(
      'Invalid environment variables: ',
      parsed.error.flatten().fieldErrors,
    )
    throw new Error('Invalid environment variables')
  }
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getPublicEnv() {
  return {
    MODE: process.env.NODE_ENV,
  }
}

type ENV = ReturnType<typeof getPublicEnv>

declare global {
  var ENV: ENV
  interface window {
    ENV: ENV
  }
}
