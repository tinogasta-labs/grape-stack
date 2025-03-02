import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import {
  Form,
  Link,
  type MetaFunction,
  data,
  href,
  redirect,
  useSearchParams,
} from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { ErrorList } from '~/components/forms'
import { Button, Checkbox, Input, Label } from '~/components/ui'
import { AUTH_SESSION_KEY, login, requireAnonymous } from '~/utils/auth.server'
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
  redirectTo: z.string().optional(),
})

export const meta: MetaFunction = () => [{ title: 'Login | Grape Stack' }]

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = await parseWithZod(formData, {
    schema: intent =>
      LoginFormSchema.transform(async (data, ctx) => {
        if (intent !== null) return { ...data, session: null }
        const session = await login(data)
        if (!session) {
          ctx.addIssue({
            code: 'custom',
            message: 'Invalid username or password',
          })
          return z.NEVER
        }
        return { ...data, session }
      }),
    async: true,
  })

  if (submission.status !== 'success' || !submission.value.session) {
    return data(
      { result: submission.reply({ hideFields: ['password'] }) },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { session, remember, redirectTo } = submission.value

  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  authSession.set(AUTH_SESSION_KEY, session.id)
  return redirect(safeRedirect(redirectTo), {
    headers: {
      'set-cookie': await authSessionStorage.commitSession(authSession, {
        expires: remember ? session.expirationDate : undefined,
      }),
    },
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnonymous(request)
  return {}
}

export default function LoginRoute({ actionData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  const [form, fields] = useForm({
    id: 'login-form',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: LoginFormSchema })
    },
    defaultValue: {
      redirectTo,
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
          <input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />
          <div className="flex flex-col gap-1">
            <Label htmlFor={fields.username.id}>Username</Label>
            <Input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your username or email"
              {...getInputProps(fields.username, { type: 'text' })}
            />
            <ErrorList
              errors={fields.username.errors}
              id={fields.username.errorId}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={fields.password.id}>Password</Label>
            <Input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your password"
              {...getInputProps(fields.password, { type: 'password' })}
            />
            <ErrorList
              errors={fields.password.errors}
              id={fields.password.errorId}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Checkbox
                {...getInputProps(fields.remember, { type: 'checkbox' })}
              />
              <Label htmlFor={fields.remember.id}>Remember me</Label>
            </div>
            <Link
              className="text-fg-muted hover:text-fg text-sm underline"
              to={href('/forgot-password')}
            >
              Forgot password
            </Link>
          </div>
          <ErrorList errors={form.errors} id={form.errorId} />
          <Button type="submit">Login</Button>
        </Form>
        <div className="text-fg-muted py-4 text-sm">
          <p>
            Don't have an account?{' '}
            <Link className="hover:text-fg underline" to={href('/signup')}>
              Sign up
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
