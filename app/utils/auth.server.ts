import type { User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { db } from './db.server'

export async function login({
  username,
  password,
}: {
  username: User['username']
  password: string
}) {
  return verifyUserPassword({ username }, password)
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
