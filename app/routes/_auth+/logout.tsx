import { redirect } from 'react-router'
import { logout } from '~/utils/auth.server'
import type { Route } from './+types/logout'

export async function loader() {
  return redirect('/')
}

export async function action({ request }: Route.ActionArgs) {
  return logout(request)
}
