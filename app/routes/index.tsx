import { Form } from 'react-router'
import { Button } from '~/components/ui'
import { requireUserId } from '~/utils/auth.server'
import type { Route } from './+types'

export function meta() {
  return [
    { title: 'Grape Stack' },
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
      <h1 className="text-xl">Welcome</h1>
      <p className="text-fg-muted">This is a description</p>
      <div className="mt-6">
        <Form method="POST" action="/logout">
          <Button type="submit" className="w-auto">
            Logout
          </Button>
        </Form>
      </div>
    </div>
  )
}
