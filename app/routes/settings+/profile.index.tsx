import { invariantResponse } from '@epic-web/invariant'
import { useFetcher } from 'react-router'
import { Button } from '~/components/ui'
import { AUTH_SESSION_KEY, requireUserId } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import { authSessionStorage } from '~/utils/session.server'
import type { Info, Route } from './+types/profile.index'

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

const signOutOfSessionsActionIntent = 'sign-out-of-sessions'

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const intent = formData.get('intent')
  switch (intent) {
    case signOutOfSessionsActionIntent:
      return signOutOfSessions({ request, userId })

    default:
      throw new Response('Invalid intent', { status: 400 })
  }
}

export default function UserProfileRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div className="p-4">
      <SignOutSessions loaderData={loaderData} />
    </div>
  )
}

function SignOutSessions({ loaderData }: { loaderData: Info['loaderData'] }) {
  const otherSessionsCount = loaderData.user._count.sessions - 1
  const fetcher = useFetcher()
  return (
    <div>
      <h1 className="mb-4 text-xl">Active Sessions</h1>
      {otherSessionsCount ? (
        <fetcher.Form method="POST">
          <Button
            type="submit"
            name="intent"
            value={signOutOfSessionsActionIntent}
            className="w-auto"
          >
            Sign out of {otherSessionsCount} other sessions
          </Button>
        </fetcher.Form>
      ) : (
        <p className="text-fg-muted">This is your only session. </p>
      )}
    </div>
  )
}

async function signOutOfSessions({
  request,
  userId,
}: {
  request: Request
  userId: string
}) {
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
