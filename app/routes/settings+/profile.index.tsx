import { invariantResponse } from '@epic-web/invariant'
import { useFetcher } from 'react-router'
import { AUTH_SESSION_KEY, requireUserId } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import { authSessionStorage } from '~/utils/session.server'
import type { Route } from './+types/profile.index'

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const user = await db.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      _count: {
        select: {
          sessions: {
            where: {
              expirationDate: { gt: new Date() },
            },
          },
        },
      },
    },
  })

  return {
    user,
  }
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  const sessionId = authSession.get(AUTH_SESSION_KEY)
  invariantResponse(sessionId, 'You must be authenticated')
  await db.session.deleteMany({
    where: {
      userId,
      id: { not: sessionId },
    },
  })
  return { status: 'success' }
}

export default function UserProfileRoute({ loaderData }: Route.ComponentProps) {
  const otherSessionsCount = loaderData.user._count.sessions - 1
  const fetcher = useFetcher()
  return (
    <div className="p-4">
      {otherSessionsCount ? (
        <fetcher.Form method="POST">
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-black px-4 py-3 text-white"
          >
            Sign out of ${otherSessionsCount} other sessions
          </button>
        </fetcher.Form>
      ) : (
        <p>This is your only session. </p>
      )}
    </div>
  )
}
