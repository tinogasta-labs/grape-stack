import { test as base } from '@playwright/test'
import type { User as UserModel } from '@prisma/client'
import { db } from '~/utils/db.server'
import { createPassword, createUser } from './db-utils'

type GetOrInsertUserOptions = {
  id?: string
  username?: UserModel['username']
  password?: string
  email?: UserModel['email']
}

type User = {
  id: string
  email: string
  username: string
}

async function getOrInsertUser({
  id,
  username,
  password,
  email,
}: GetOrInsertUserOptions = {}): Promise<User> {
  const select = { id: true, email: true, username: true }
  if (id) {
    return await db.user.findUniqueOrThrow({
      select,
      where: { id: id },
    })
  }
  const userData = createUser()
  username ??= userData.username
  password ??= userData.username
  email ??= userData.email
  return await db.user.create({
    select,
    data: {
      ...userData,
      email,
      username,
      password: { create: await createPassword(password) },
    },
  })
}

export const test = base.extend<{
  insertNewUser(options?: GetOrInsertUserOptions): Promise<User>
}>({
  // biome-ignore lint/correctness/noEmptyPattern: first arg must use obj destructuring
  insertNewUser: async ({}, use) => {
    let userId: string | undefined = undefined
    await use(async options => {
      const user = await getOrInsertUser(options)
      userId = user.id
      return user
    })
    await db.user.delete({ where: { id: userId } })
  },
})

export const { expect } = test
