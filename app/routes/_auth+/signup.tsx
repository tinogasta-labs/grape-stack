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
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { requireAnonymous } from '~/utils/auth.server'
import { UserEmailSchema } from '~/utils/validation'
import type { Route } from './+types/signup'

const SignupFormSchema = z.object({
  email: UserEmailSchema,
})

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = parseWithZod(formData, { schema: SignupFormSchema })

  if (submission.status !== 'success') {
    return data(
      { result: submission.reply() },
      { status: submission.error ? 400 : 200 },
    )
  }

  // TODO send code verification

  return redirect('/verify')
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
