import {
  getFormProps,
  getInputProps,
  getTextareaProps,
  useForm,
} from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { Link, data, href, useFetcher } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '~/components/forms'
import { Button, Input, Label, TextArea } from '~/components/ui'
import { AUTH_SESSION_KEY, requireUserId } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import { authSessionStorage } from '~/utils/session.server'
import { OptionalUrl } from '~/utils/validation'
import type { Info, Route } from './+types/profile.index'

const ProfileFormSchema = z.object({
  name: z.string().max(50, { message: 'Name is too long' }).optional(),
  bio: z.string().max(160, { message: 'Bio is too long' }).optional(),
  website: OptionalUrl,
})

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const user = await db.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      profile: {
        select: {
          name: true,
          bio: true,
          website: true,
        },
      },
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
const updateProfileActionIntent = 'update-profile'

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const intent = formData.get('intent')
  switch (intent) {
    case signOutOfSessionsActionIntent:
      return signOutOfSessions({ request, userId })

    case updateProfileActionIntent:
      return updateProfile({ userId, formData })

    default:
      throw new Response('Invalid intent', { status: 400 })
  }
}

export default function UserProfileRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Settings</h1>
      <UpdateProfile loaderData={loaderData} />
      <div className="my-4">
        <Link to={href('/settings/profile/password')} className="underline">
          Change password
        </Link>
      </div>
      <SignOutSessions loaderData={loaderData} />
    </div>
  )
}

function UpdateProfile({ loaderData }: { loaderData: Info['loaderData'] }) {
  const profile = loaderData.user.profile
  const fetcher = useFetcher<typeof updateProfile>()
  const [form, fields] = useForm({
    id: 'update-profile-form',
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ProfileFormSchema })
    },
    defaultValue: {
      name: profile?.name,
      bio: profile?.bio,
      website: profile?.website,
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="max-w-lg">
      <fetcher.Form
        method="post"
        {...getFormProps(form)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor={fields.name.id}>Name</Label>
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            placeholder="Enter your name"
          />
          <ErrorList errors={fields.name.errors} id={fields.name.errorId} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={fields.bio.id}>Bio</Label>
          <TextArea
            {...getTextareaProps(fields.bio)}
            className="resize-none"
            placeholder="Enter your bio"
            maxLength={160}
          />
          <ErrorList errors={fields.bio.errors} id={fields.bio.errorId} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={fields.website.id}>Website</Label>
          <Input
            {...getInputProps(fields.website, { type: 'text' })}
            placeholder="https://yourwebsite.com"
          />
          <ErrorList
            errors={fields.website.errors}
            id={fields.website.errorId}
          />
        </div>
        <ErrorList errors={form.errors} id={form.errorId} />
        <Button type="submit" name="intent" value={updateProfileActionIntent}>
          Save Profile
        </Button>
      </fetcher.Form>
    </div>
  )
}

async function updateProfile({
  userId,
  formData,
}: {
  userId: string
  formData: FormData
}) {
  const submission = parseWithZod(formData, { schema: ProfileFormSchema })
  if (submission.status !== 'success') {
    return data(
      {
        result: submission.reply(),
      },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }
  const { name, bio, website } = submission.value

  const profileData = {
    name: name ?? '',
    bio: bio ?? '',
    website: website ?? '',
  }

  await db.profile.upsert({
    where: { userId: userId },
    update: profileData,
    create: {
      ...profileData,
      user: { connect: { id: userId } },
    },
  })

  return {
    result: submission.reply(),
  }
}

function SignOutSessions({ loaderData }: { loaderData: Info['loaderData'] }) {
  const otherSessionsCount = loaderData.user._count.sessions - 1
  const fetcher = useFetcher()
  return (
    <div>
      <h1 className="mb-4 text-lg">Manage Sessions</h1>
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
