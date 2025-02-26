import { z } from 'zod'

export const NonEmptyString = z.string().trim().min(1)
