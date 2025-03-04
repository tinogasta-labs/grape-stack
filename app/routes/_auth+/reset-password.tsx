import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, type MetaFunction, data, redirect } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { ErrorList } from '~/components/forms'
import { Button, Input, Label } from '~/components/ui'
import { resetUserPassword } from '~/utils/auth.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { useIsPending } from '~/utils/misc'
import { PasswordAndConfirmPasswordSchema } from '~/utils/validation'
import { verifySessionStorage } from '~/utils/verify.server'
import type { Route } from './+types/reset-password'
import { requireResetPasswordUsername } from './reset-password.server'

export const RESET_PASSWORD_USERNAME_SESION_KEY = 'resetPasswordUsername'

const ResetPasswordFormSchema = PasswordAndConfirmPasswordSchema

export async function action({ request }: Route.ActionArgs) {
  const resetPasswordUsername = await requireResetPasswordUsername(request)
  const formData = await request.formData()
  await checkHoneypot(formData)
  const submission = parseWithZod(formData, { schema: ResetPasswordFormSchema })

  if (submission.status !== 'success') {
    return data(
      { result: submission.reply() },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { password } = submission.value

  await resetUserPassword({ username: resetPasswordUsername, password })

  const verifySession = await verifySessionStorage.getSession()

  return redirect('/login', {
    headers: {
      'set-cookie': await verifySessionStorage.destroySession(verifySession),
    },
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  const username = await requireResetPasswordUsername(request)
  return { username }
}

export const meta: MetaFunction = () => [
  { title: 'Reset Password | Grape Stack' },
]

export default function ResetPasswordRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const isPending = useIsPending()
  const [form, fields] = useForm({
    id: 'reset-password',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ResetPasswordFormSchema })
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Reset password</h1>
      <p className="text-fg-muted mt-3">
        Hi, {loaderData.username}. No worries. It happens all the time.
      </p>
      <div className="mt-6 max-w-lg">
        <Form
          method="POST"
          className="flex flex-col gap-4"
          {...getFormProps(form)}
        >
          <HoneypotInputs />
          <div className="flex flex-col gap-1">
            <Label htmlFor={fields.password.id}>New password</Label>
            <Input
              placeholder="Enter your password"
              {...getInputProps(fields.password, { type: 'password' })}
            />
            <ErrorList
              errors={fields.password.errors}
              id={fields.password.errorId}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={fields.confirmPassword.id}>Confirm password</Label>
            <Input
              placeholder="Confirm your password"
              {...getInputProps(fields.confirmPassword, { type: 'password' })}
            />
            <ErrorList
              errors={fields.confirmPassword.errors}
              id={fields.confirmPassword.errorId}
            />
          </div>

          <ErrorList errors={form.errors} id={form.errorId} />
          <Button type="submit" disabled={isPending}>
            Change password
          </Button>
        </Form>
      </div>
    </div>
  )
}
