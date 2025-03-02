import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, data, redirect } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { ErrorList } from '~/components/forms'
import { Button, Checkbox, Input, Label } from '~/components/ui'
import { AUTH_SESSION_KEY, signup } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { authSessionStorage } from '~/utils/session.server'
import {
  PasswordAndConfirmPasswordSchema,
  UsernameSchema,
} from '~/utils/validation'
import { verifySessionStorage } from '~/utils/verify.server'
import type { Route } from './+types/onboarding'
import { requireOnboardingEmail } from './onboarding.server'

export const ONBOARDING_EMAIL_SESSION_KEY = 'email'

const SignupFormSchema = z
  .object({
    username: UsernameSchema,
    agreeToTermsAndPrivacy: z.boolean({
      required_error:
        'You must agree to the terms of service and privacy policy.',
    }),
    remember: z.boolean().default(false),
  })
  .and(PasswordAndConfirmPasswordSchema)

export async function action({ request }: Route.ActionArgs) {
  const email = await requireOnboardingEmail(request)
  const formData = await request.formData()
  await checkHoneypot(formData)
  const submission = await parseWithZod(formData, {
    schema: intent =>
      SignupFormSchema.superRefine(async (data, ctx) => {
        const existingUser = await db.user.findUnique({
          where: { username: data.username },
          select: { id: true },
        })
        if (existingUser) {
          ctx.addIssue({
            path: ['username'],
            code: 'custom',
            message: 'A user already exists with this username',
          })
          return
        }
      }).transform(async data => {
        if (intent !== null) return { ...data, session: null }
        const session = await signup({ ...data, email })
        return { ...data, session }
      }),
    async: true,
  })

  if (submission.status !== 'success' || !submission.value.session) {
    return data(
      { result: submission.reply() },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { session, remember } = submission.value

  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  authSession.set(AUTH_SESSION_KEY, session.id)
  const verifySession = await verifySessionStorage.getSession()
  const headers = new Headers()
  headers.append(
    'set-cookie',
    await authSessionStorage.commitSession(authSession, {
      expires: remember ? session.expirationDate : undefined,
    }),
  )
  headers.append(
    'set-cookie',
    await verifySessionStorage.destroySession(verifySession),
  )

  return redirect('/', { headers })
}

export async function loader({ request }: Route.LoaderArgs) {
  const email = await requireOnboardingEmail(request)
  return { email }
}

export default function OnboardingRoute({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const [form, fields] = useForm({
    id: 'onboarding-form',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SignupFormSchema })
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Welcome {loaderData.email}</h1>
      <p className="text-fg-muted">Please enter your details.</p>
      <div className="mt-6 max-w-lg">
        <Form
          method="POST"
          className="flex flex-col gap-2"
          {...getFormProps(form)}
        >
          <HoneypotInputs />
          <div className="flex flex-col gap-2">
            <Label htmlFor={fields.username.id}>Username</Label>
            <Input
              placeholder="Enter your username"
              {...getInputProps(fields.username, { type: 'text' })}
            />
            <ErrorList
              errors={fields.username.errors}
              id={fields.username.errorId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={fields.password.id}>Password</Label>
            <Input
              placeholder="Enter your password"
              {...getInputProps(fields.password, { type: 'password' })}
            />
            <ErrorList
              errors={fields.password.errors}
              id={fields.password.errorId}
            />
          </div>
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                {...getInputProps(fields.agreeToTermsAndPrivacy, {
                  type: 'checkbox',
                })}
              />
              <Label htmlFor={fields.agreeToTermsAndPrivacy.id}>
                Agree terms and privacy
              </Label>
            </div>
            <ErrorList
              errors={fields.agreeToTermsAndPrivacy.errors}
              id={fields.agreeToTermsAndPrivacy.errorId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                {...getInputProps(fields.remember, {
                  type: 'checkbox',
                })}
              />
              <Label htmlFor={fields.agreeToTermsAndPrivacy.id}>
                Remember me
              </Label>
            </div>
          </div>

          <ErrorList errors={form.errors} id={form.errorId} />

          <Button type="submit">Submit</Button>
        </Form>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
