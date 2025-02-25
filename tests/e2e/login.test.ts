import { faker } from '@faker-js/faker'
import { expect, test } from '../playwright-utils'

test('login as existing user', async ({ page, insertNewUser }) => {
  const password = faker.internet.password()
  const user = await insertNewUser({ password })
  await page.goto('/login')
  await page.getByRole('textbox', { name: /username/i }).fill(user.username)
  await page.getByLabel(/^password$/i).fill(password)
  await page.getByRole('button', { name: /login/i }).click()
  await expect(page).toHaveURL('/')
})
