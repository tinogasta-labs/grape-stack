import { Form, Link, type MetaFunction, href } from 'react-router'
import { requireAnonymous } from '~/utils/auth.server'
import type { Route } from './+types/forgot-password'

export async function action() {
  throw new Response('Not implemented yet', { status: 501 })
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnonymous(request)
  return {}
}

export const meta: MetaFunction = () => [
  { title: 'Forgot Password | Grape Stack' },
]

export default function ForgotPasswordRoute() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Forgot password</h1>
      <p>No worries, well send your reset instructions.</p>
      <div className="mt-6 max-w-lg">
        <Form method="POST" className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your email"
              id="email"
            />
          </div>
          <button
            className="w-full cursor-pointer rounded-lg border bg-black py-3 text-white"
            type="submit"
          >
            Continue
          </button>
        </Form>
        <div className="mt-4">
          <Link to={href('/login')} className="underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
