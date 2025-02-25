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
    <div>
      <h1>Welcome</h1>
    </div>
  )
}
