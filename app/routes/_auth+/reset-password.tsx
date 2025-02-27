import { Form, type MetaFunction } from 'react-router'
import { requireAnonymous } from '~/utils/auth.server'
import type { Route } from './+types/reset-password'

export const RESET_PASSWOD_EMAIL_SESSION_KEY = 'resetPasswordEmail'

export async function action() {
  throw new Response('Not implemented yet', { status: 501 })
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnonymous(request)
  return {}
}

export const meta: MetaFunction = () => [
  { title: 'Reset Password | Grape Stack' },
]

export default function ResetPasswordRoute() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Reset password</h1>
      <div className="mt-6 max-w-lg">
        <Form method="POST" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="newPassword">New password</label>
            <input
              className="w-full rounded-lg border px-2 py-3"
              id="newPassword"
              placeholder="Enter your password"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirmPasssowrd">Confirm password</label>
            <input
              className="w-full rounded-lg border px-2 py-3"
              id="confirmPassword"
              placeholder="Confirm your password"
            />
          </div>

          <button
            className="w-full cursor-pointer rounded-lg border bg-black py-3 text-white"
            type="submit"
          >
            Change password
          </button>
        </Form>
      </div>
    </div>
  )
}
