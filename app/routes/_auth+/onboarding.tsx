import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, data } from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import {
  PasswordAndConfirmPasswordSchema,
  UsernameSchema,
} from '~/utils/validation'
import type { Route } from './+types/onboarding'

export const ONBOARDING_EMAIL_SESSION_KEY = 'email'

const OnboardingFormSchema = z
  .object({
    username: UsernameSchema,
    agreeToTermsAndPrivacy: z.boolean({
      required_error:
        'You must agree to the terms of service and privacy policy.',
    }),
  })
  .and(PasswordAndConfirmPasswordSchema)

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = parseWithZod(formData, { schema: OnboardingFormSchema })

  if (submission.status !== 'success') {
    return data(
      { result: submission.reply() },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }
  throw new Response('Not implemented yet!', { status: 501 })
}

export default function OnboardingRoute({ actionData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    id: 'onboarding-form',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: OnboardingFormSchema })
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Welcome</h1>
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
