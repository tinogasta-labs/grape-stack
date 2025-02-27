import type { User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { redirect } from 'react-router'
import { db } from './db.server'
import { authSessionStorage } from './session.server'

export const AUTH_SESSION_KEY = 'userId'

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
  return verifyUserPassword({ username }, password)
}

export async function logout(request: Request) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  throw redirect('/', {
    headers: {
      'set-cookie': await authSessionStorage.destroySession(authSession),
    },
  })
}

async function verifyUserPassword(
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
  const userId = authSession.get(AUTH_SESSION_KEY)
  if (!userId) return null
  // verify user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) {
    throw redirect('/', {
      headers: {
        'set-cookie': await authSessionStorage.destroySession(authSession),
      },
    })
  }
  return user.id
}

export async function requireUserId(request: Request) {
  const userId = await getUserId(request)
  if (!userId) {
    throw redirect('/login')
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
  const user = await db.user.create({
    select: { id: true },
    data: {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  })
  return user
}

async function getPasswordHash(password: string) {
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
