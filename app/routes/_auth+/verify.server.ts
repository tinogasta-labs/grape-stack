import type { Submission } from '@conform-to/react'
import { verifyTOTP } from '@epic-web/totp'
import type { z } from 'zod'
import { db } from '~/utils/db.server'
import type { VerificationTypes, VerifyFormSchema } from './verify'

export type VerifyFunctionArgs = {
  request: Request
  submission: Submission<
    z.input<typeof VerifyFormSchema>,
    string[],
    z.output<typeof VerifyFormSchema>
  >
  body: FormData | URLSearchParams
}

export async function isCodeValid({
  code,
  type,
  target,
}: {
  code: string
  type: VerificationTypes
  target: string
}) {
  const verification = await db.verification.findUnique({
    where: {
      target_type: { target, type },
      OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
    },
    select: { algorithm: true, secret: true, period: true, charSet: true },
  })
  if (!verification) return false
  const result = await verifyTOTP({
    otp: code,
    ...verification,
  })
  if (!result) return false
  return true
}
