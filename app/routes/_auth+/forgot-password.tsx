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
import { z } from 'zod'
import { ErrorList } from '~/components/forms'
import { ForgotPasswordEmail } from '~/components/templates/forgot-email'
import { Button, Input, Label } from '~/components/ui'
import { requireAnonymous } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import { sendEmail } from '~/utils/email.server'
import { UserEmailSchema } from '~/utils/validation'
import type { Route } from './+types/forgot-password'
import { prepareVerification } from './verify.server'

const ForgotPasswordFormSchema = z.object({
  email: UserEmailSchema,
})

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = await parseWithZod(formData, {
    schema: intent =>
      ForgotPasswordFormSchema.superRefine(async (data, ctx) => {
        const user = await db.user.findUnique({
          where: { email: data.email },
          select: { id: true },
        })
        if (!user) {
          ctx.addIssue({
            path: ['email'],
            code: 'custom',
            message: 'Not user exists with this email',
          })
          return
        }
      }).transform(async data => {
        if (intent !== null) return { ...data, user: null }
        const user = await db.user.findUnique({
          where: { email: data.email },
          select: { email: true, username: true },
        })
        return { ...data, user }
      }),
    async: true,
  })

  if (submission.status !== 'success' || !submission.value.user) {
    return data(
      {
        result: submission.reply(),
      },
      {
        status: submission.status === 'error' ? 400 : 200,
      },
    )
  }

  const { user } = submission.value

  const { verifyUrl, otp, redirectTo } = await prepareVerification({
    period: 10 * 60,
    request,
    type: 'reset-password',
    target: user.email,
  })

  const response = await sendEmail({
    to: user.email,
    subject: 'Grapa Stack Reset Password',
    react: (
      <ForgotPasswordEmail onboardingUrl={verifyUrl.toString()} otp={otp} />
    ),
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

export const meta: MetaFunction = () => [
  { title: 'Forgot Password | Grape Stack' },
]

export default function ForgotPasswordRoute({
  actionData,
}: Route.ComponentProps) {
  const [form, fields] = useForm({
    id: 'forgot-password',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ForgotPasswordFormSchema })
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Forgot password</h1>
      <p className="text-fg-muted">
        No worries, well send your reset instructions.
      </p>
      <div className="mt-6 max-w-lg">
        <Form
          method="POST"
          className="flex flex-col gap-2"
          {...getFormProps(form)}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor={fields.email.id} className="sr-only">
              Email
            </Label>
            <Input
              placeholder="Enter your email"
              {...getInputProps(fields.email, { type: 'text' })}
            />
            <ErrorList errors={fields.email.errors} id={fields.email.errorId} />
          </div>
          <ErrorList errors={form.errors} id={form.errorId} />
          <Button>Continue</Button>
        </Form>
        <div className="text-fg-muted mt-4">
          <Link to={href('/login')} className="hover:text-fg underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
