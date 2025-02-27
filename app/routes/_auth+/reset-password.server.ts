import { invariant } from '@epic-web/invariant'
import { data, redirect } from 'react-router'
import { requireAnonymous } from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import { verifySessionStorage } from '~/utils/verify.server'
import { RESET_PASSWORD_USERNAME_SESION_KEY } from './reset-password'
import type { VerifyFunctionArgs } from './verify.server'

export async function handleVerification({ submission }: VerifyFunctionArgs) {
  invariant(
    submission.status === 'success',
    'Submission should be successful by now',
  )
  const target = submission.value.target
  const user = await db.user.findFirst({
    where: { OR: [{ email: target }, { username: target }] },
    select: { email: true, username: true },
  })
  // we don't want to say the user is not found if the email is not found
  // because that would allow an attacker to check if an email is registered
  if (!user) {
    return data(
      { result: submission.reply({ fieldErrors: { code: ['Invalid code'] } }) },
      { status: 400 },
    )
  }

  const verifySession = await verifySessionStorage.getSession()
  verifySession.set(RESET_PASSWORD_USERNAME_SESION_KEY, user.username)
  return redirect('/reset-password', {
    headers: {
      'set-cookie': await verifySessionStorage.commitSession(verifySession),
    },
  })
}

export async function requireResetPasswordUsername(request: Request) {
  await requireAnonymous(request)
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie'),
  )
  const resetPasswordUsername = verifySession.get(
    RESET_PASSWORD_USERNAME_SESION_KEY,
  )
  if (typeof resetPasswordUsername !== 'string' || !resetPasswordUsername) {
    throw redirect('/login')
  }
  return resetPasswordUsername
}
