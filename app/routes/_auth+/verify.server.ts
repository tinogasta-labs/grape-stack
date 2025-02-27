import type { Submission } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { generateTOTP, verifyTOTP } from '@epic-web/totp'
import { data } from 'react-router'
import type { z } from 'zod'
import { db } from '~/utils/db.server'
import { getDomainUrl } from '~/utils/misc'
import { handleVerification } from './onboarding.server'
import {
  CODE_QUERY_PARAM,
  REDIRECT_TO_QUERY_PARAM,
  TARGET_QUERY_PARAM,
  TYPE_QUERY_PARAM,
  type VerificationTypes,
  VerifyFormSchema,
} from './verify'

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

export function getRedirectToUrl({
  request,
  type,
  target,
  redirectTo,
}: {
  request: Request
  type: VerificationTypes
  target: string
  redirectTo?: string
}) {
  const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
  redirectToUrl.searchParams.set(TYPE_QUERY_PARAM, type)
  redirectToUrl.searchParams.set(TARGET_QUERY_PARAM, target)
  if (redirectTo) {
    redirectToUrl.searchParams.set(REDIRECT_TO_QUERY_PARAM, redirectTo)
  }
  return redirectToUrl
}

export async function prepareVerification({
  period,
  request,
  type,
  target,
}: {
  period: number
  request: Request
  type: VerificationTypes
  target: string
}) {
  const verifyUrl = getRedirectToUrl({ request, type, target })
  const redirectTo = new URL(verifyUrl.toString())

  const { otp, ...verificationConfig } = await generateTOTP({
    algorithm: 'SHA-256',
    // Leaving off 0, O, and I on purpose to avoid confusing users.
    charSet: 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789',
    period,
  })
  const verificationData = {
    type,
    target,
    ...verificationConfig,
    expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
  }
  await db.verification.upsert({
    where: { target_type: { target, type } },
    create: verificationData,
    update: verificationData,
  })

  // add the otp to the url we'll email the user.
  verifyUrl.searchParams.set(CODE_QUERY_PARAM, otp)

  return { otp, redirectTo, verifyUrl }
}

export async function validateRequest(
  request: Request,
  body: URLSearchParams | FormData,
) {
  const submission = await parseWithZod(body, {
    schema: VerifyFormSchema.superRefine(async (data, ctx) => {
      const codeIsValid = await isCodeValid({
        code: data[CODE_QUERY_PARAM],
        type: data[TYPE_QUERY_PARAM],
        target: data[TARGET_QUERY_PARAM],
      })
      if (!codeIsValid) {
        ctx.addIssue({
          path: ['code'],
          code: 'custom',
          message: 'Invalid code',
        })
        return
      }
    }),
    async: true,
  })
  if (submission.status !== 'success') {
    return data(
      { result: submission.reply() },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { value: submissionValue } = submission

  async function deleteVerification() {
    await db.verification.delete({
      where: {
        target_type: {
          type: submissionValue[TYPE_QUERY_PARAM],
          target: submissionValue[TARGET_QUERY_PARAM],
        },
      },
    })
  }

  switch (submissionValue[TYPE_QUERY_PARAM]) {
    case 'onboarding': {
      await deleteVerification()
      return handleVerification({ request, body, submission })
    }
  }
}
