import { createPassword } from '@tests/db-utils'
import { db } from '~/utils/db.server'

async function seed() {
  // clean database
  await db.user.deleteMany({})
  await db.verification.deleteMany({})

  // insert fake user
  await db.user.create({
    data: {
      email: 'demouser@email.com',
      username: 'demouser',
      password: {
        create: await createPassword('demopassword'),
      },
    },
  })
}

seed()
  .catch(e => {
    // biome-ignore lint/suspicious/noConsole: log seed error
    console.log(e)
  })
  .finally(async () => {
    await db.$disconnect()
  })
