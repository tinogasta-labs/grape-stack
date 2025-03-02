import type { User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { redirect } from 'react-router'
import { db } from './db.server'
import { authSessionStorage } from './session.server'

export const AUTH_SESSION_KEY = 'sessionId'

const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30 // 30 days
export const getSessionExpirationDate = () =>
  new Date(Date.now() + SESSION_EXPIRATION_TIME)

export async function login({
  username,
  password,
}: {
  username: User['username']
  password: string
}) {
  const user = await verifyUserPassword({ username }, password)
  if (!user) return null
  const session = await db.session.create({
    select: { id: true, expirationDate: true },
    data: {
      userId: user.id,
      expirationDate: getSessionExpirationDate(),
    },
  })
  return session
}

export async function logout(request: Request) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  const sessionId = authSession.get(AUTH_SESSION_KEY)
  if (sessionId) {
    void (await db.session
      .deleteMany({ where: { id: sessionId } })
      .catch(() => {}))
  }
  throw redirect('/', {
    headers: {
      'set-cookie': await authSessionStorage.destroySession(authSession),
    },
  })
}

export async function verifyUserPassword(
  where: Pick<User, 'username'> | Pick<User, 'id'>,
  passwrod: string,
) {
  const userWithPassword = await db.user.findUnique({
    where,
    select: { id: true, password: { select: { hash: true } } },
  })
  if (!userWithPassword || !userWithPassword.password) {
    return null
  }
  const isValid = await bcrypt.compare(passwrod, userWithPassword.password.hash)
  if (!isValid) {
    return null
  }

  return { id: userWithPassword.id }
}

export async function getUserId(request: Request) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  const sessionId = authSession.get(AUTH_SESSION_KEY)
  if (!sessionId) return null
  // verify session
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  })
  if (!session) {
    throw redirect('/', {
      headers: {
        'set-cookie': await authSessionStorage.destroySession(authSession),
      },
    })
  }
  return session.userId
}

export async function requireUserId(
  request: Request,
  { redirectTo }: { redirectTo?: string | null } = {},
) {
  const userId = await getUserId(request)
  if (!userId) {
    const requestUrl = new URL(request.url)
    const goTo =
      redirectTo === null
        ? null
        : (redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`)
    const loginParams = goTo ? new URLSearchParams({ redirectTo: goTo }) : null
    const loginRedirect = ['/login', loginParams?.toString()]
      .filter(Boolean)
      .join('?')
    throw redirect(loginRedirect)
  }
  return userId
}

export async function requireAnonymous(request: Request) {
  const userId = await getUserId(request)
  if (userId) {
    throw redirect('/')
  }
}

export async function signup({
  email,
  username,
  password,
}: {
  email: User['email']
  username: User['username']
  password: string
}) {
  const hashedPassword = await getPasswordHash(password)
  const session = await db.session.create({
    select: { id: true, expirationDate: true },
    data: {
      expirationDate: getSessionExpirationDate(),
      user: {
        create: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          password: {
            create: {
              hash: hashedPassword,
            },
          },
        },
      },
    },
  })
  return session
}

export async function getPasswordHash(password: string) {
  return bcrypt.hash(password, 10)
}

export async function resetUserPassword({
  username,
  password,
}: {
  username: User['username']
  password: string
}) {
  const hashedPassword = await getPasswordHash(password)
  return db.user.update({
    where: { username },
    data: {
      password: {
        update: {
          hash: hashedPassword,
        },
      },
    },
  })
}
