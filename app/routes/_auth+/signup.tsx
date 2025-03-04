import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import {
  Form,
  Link,
  type MetaFunction,
  data,
  href,
  redirect,
} from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { ErrorList } from '~/components/forms'
import { SignupEmail } from '~/components/templates/signup-email'
import { Button, Input } from '~/components/ui'
import { requireAnonymous } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import { sendEmail } from '~/utils/email.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { useIsPending } from '~/utils/misc'
import { UserEmailSchema } from '~/utils/validation'
import type { Route } from './+types/signup'
import { prepareVerification } from './verify.server'

const SignupFormSchema = z.object({
  email: UserEmailSchema,
})

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  await checkHoneypot(formData)
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

  const { verifyUrl, otp, redirectTo } = await prepareVerification({
    period: 10 * 60,
    request,
    type: 'onboarding',
    target: email,
  })

  const response = await sendEmail({
    to: email,
    subject: 'Welcome to Grape Stack!',
    react: <SignupEmail onboardingUrl={verifyUrl.toString()} otp={otp} />,
  })

  if (response.status === 'success') {
    return redirect(redirectTo.toString())
  }

  return data(
    {
      result: submission.reply({ formErrors: [response.error.message] }),
    },
    { status: 500 },
  )
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnonymous(request)
  return {}
}

export const meta: MetaFunction = () => [{ title: 'Sign up | Grape Stack' }]

export default function SignupRoute({ actionData }: Route.ComponentProps) {
  const isPending = useIsPending()
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
      <p className="text-fg-muted">We need your email to continue.</p>
      <div className="mt-6 max-w-lg">
        <Form
          method="POST"
          className="flex flex-col gap-2"
          {...getFormProps(form)}
        >
          <HoneypotInputs />
          <div className="flex flex-col gap-2">
            <Input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your email"
              {...getInputProps(fields.email, { type: 'email' })}
            />
            <ErrorList errors={fields.email.errors} id={fields.email.errorId} />
          </div>
          <ErrorList errors={form.errors} id={form.errorId} />
          <Button type="submit" disabled={isPending}>
            Continue
          </Button>
        </Form>
        <div className="text-fg-muted py-4 text-sm">
          <p>
            Already have an account?{' '}
            <Link className="hover:text-fg underline" to={href('/login')}>
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
