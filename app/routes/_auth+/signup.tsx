import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { generateTOTP } from '@epic-web/totp'
import {
  Form,
  Link,
  type MetaFunction,
  data,
  href,
  redirect,
} from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { requireAnonymous } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import { getDomainUrl } from '~/utils/misc'
import { UserEmailSchema } from '~/utils/validation'
import { verifySessionStorage } from '~/utils/verify.server'
import type { Route } from './+types/signup'
import { ONBOARDING_EMAIL_SESSION_KEY } from './onboarding'
import {
  CODE_QUERY_PARAM,
  TARGET_QUERY_PARAM,
  TYPE_QUERY_PARAM,
} from './verify'

const SignupFormSchema = z.object({
  email: UserEmailSchema,
})

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = await parseWithZod(formData, {
    schema: SignupFormSchema.superRefine(async (data, ctx) => {
      const existUser = await db.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      })
      if (existUser) {
        ctx.addIssue({
          path: ['email'],
          code: 'custom',
          message: 'Email is already taken',
        })
        return
      }
    }),
    async: true,
  })

  if (submission.status !== 'success') {
    return data(
      { result: submission.reply() },
      { status: submission.error ? 400 : 200 },
    )
  }

  const { email } = submission.value

  const { otp, ...verificationConfig } = await generateTOTP({
    algorithm: 'SHA-256',
    period: 10 * 60,
  })

  const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
  const type = 'onboarding'
  redirectToUrl.searchParams.set(TYPE_QUERY_PARAM, type)
  redirectToUrl.searchParams.set(TARGET_QUERY_PARAM, email)
  const verifyUrl = new URL(redirectToUrl)
  verifyUrl.searchParams.set(CODE_QUERY_PARAM, otp)

  const verificationData = {
    type,
    target: email,
    ...verificationConfig,
    expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
  }

  // biome-ignore lint/suspicious/noConsole: Log verify url
  console.log('YOUR VERIFY URL: ', verifyUrl)

  await db.verification.upsert({
    where: { target_type: { type, target: email } },
    create: verificationData,
    update: verificationData,
  })

  // TODO: send email with verify url/code

  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie'),
  )
  verifySession.set(ONBOARDING_EMAIL_SESSION_KEY, email)
  return redirect(redirectToUrl.toString())
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnonymous(request)
  return {}
}

export const meta: MetaFunction = () => [{ title: 'Sign up | Grape Stack' }]

export default function SignupRoute({ actionData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    id: 'signup-form',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SignupFormSchema })
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Register</h1>
      <p>We need your email to continue.</p>
      <div className="mt-6 max-w-lg">
        <Form
          method="POST"
          className="flex flex-col gap-2"
          {...getFormProps(form)}
        >
          <div className="flex flex-col gap-2">
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your email"
              {...getInputProps(fields.email, { type: 'email' })}
            />
            {JSON.stringify(fields.email.errors)}
          </div>
          <button
            className="w-full cursor-pointer rounded-lg border bg-black py-3 text-white"
            type="submit"
          >
            Continue
          </button>
        </Form>
        <div className="py-4 text-sm">
          <p>
            Already have an account?{' '}
            <Link className="underline" to={href('/login')}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
