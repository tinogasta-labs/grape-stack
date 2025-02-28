import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, data, redirect } from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { AUTH_SESSION_KEY, signup } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
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
      <p>Please enter your details.</p>
      <div className="mt-6 max-w-lg">
        <Form
          method="POST"
          className="flex flex-col gap-2"
          {...getFormProps(form)}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={fields.username.id}>Username</label>
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your username"
              {...getInputProps(fields.username, { type: 'text' })}
            />
            {JSON.stringify(fields.username.errors)}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={fields.password.id}>Password</label>
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your password"
              {...getInputProps(fields.password, { type: 'password' })}
            />
            {JSON.stringify(fields.password.errors)}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={fields.confirmPassword.id}>Confirm password</label>
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Confirm your password"
              {...getInputProps(fields.confirmPassword, { type: 'password' })}
            />
            {JSON.stringify(fields.confirmPassword.errors)}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                {...getInputProps(fields.agreeToTermsAndPrivacy, {
                  type: 'checkbox',
                })}
              />
              <label htmlFor={fields.agreeToTermsAndPrivacy.id}>
                Agree terms and privacy
              </label>
            </div>
            {JSON.stringify(fields.agreeToTermsAndPrivacy.errors)}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                {...getInputProps(fields.remember, {
                  type: 'checkbox',
                })}
              />
              <label htmlFor={fields.agreeToTermsAndPrivacy.id}>
                Remember me
              </label>
            </div>
          </div>

          <button
            className="w-full cursor-pointer rounded-lg border bg-black py-3 text-white"
            type="submit"
          >
            Submit
          </button>
        </Form>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
