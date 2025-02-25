import { Form } from 'react-router'
import { requireUserId } from '~/utils/auth.server'
import type { Route } from './+types'

export function meta() {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request)
  return {}
}

export default function Home() {
  return (
    <div className="p-4">
      <h1>Welcome</h1>
      <div className="mt-6">
        <Form method="POST" action="/logout">
          <button className="cursor-pointer underline" type="submit">
            Logout
          </button>
        </Form>
      </div>
    </div>
  )
}
