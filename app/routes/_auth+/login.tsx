import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, type MetaFunction, data, redirect } from 'react-router'
import { z } from 'zod'
import {
  AUTH_SESSION_KEY,
  getSessionExpirationDate,
  login,
} from '~/utils/auth.server'
import { authSessionStorage } from '~/utils/session.server'
import type { Route } from './+types/login'

const LoginFormSchema = z.object({
  username: z.string({ required_error: 'Username is required' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, { message: 'Password is too short' })
    .refine(val => new TextEncoder().encode(val).length <= 72, {
      message: 'Password is too long',
    }),
  remember: z.boolean().default(false),
})

export const meta: MetaFunction = () => [{ title: 'Login | Grape Stack' }]

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = await parseWithZod(formData, {
    schema: intent =>
      LoginFormSchema.transform(async (data, ctx) => {
        if (intent !== null) return { ...data, user: null }
        const user = await login(data)
        if (!user) {
          ctx.addIssue({
            code: 'custom',
            message: 'Invalid username or password',
          })
          return z.NEVER
        }
        return { ...data, user }
      }),
    async: true,
  })

  if (submission.status !== 'success' || !submission.value.user) {
    return data(
      { result: submission.reply({ hideFields: ['password'] }) },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { user, remember } = submission.value

  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  authSession.set(AUTH_SESSION_KEY, user.id)
  return redirect('/', {
    headers: {
      'set-cookie': await authSessionStorage.commitSession(authSession, {
        expires: remember ? getSessionExpirationDate() : undefined,
      }),
    },
  })
}

export default function LoginRoute({ actionData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    id: 'login-form',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: LoginFormSchema })
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Login</h1>
      <div className="mt-6 max-w-lg">
        <Form
          method="POST"
          className="flex flex-col gap-4"
          {...getFormProps(form)}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={fields.username.id}>Username</label>
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your username or email"
              {...getInputProps(fields.username, { type: 'text' })}
            />
            {JSON.stringify(fields.username.errors, null, 2)}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={fields.password.id}>Password</label>
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your password"
              {...getInputProps(fields.password, { type: 'password' })}
            />
            {JSON.stringify(fields.password.errors, null, 2)}
          </div>
          <div className="flex items-center gap-1">
            <input {...getInputProps(fields.remember, { type: 'checkbox' })} />
            <label htmlFor={fields.remember.id}>Remember me</label>
          </div>
          {JSON.stringify(form.errors, null, 2)}
          <button
            type="submit"
            className="w-full cursor-pointer rounded-lg border bg-black py-3 text-white"
          >
            Login
          </button>
        </Form>
      </div>
    </div>
  )
}
