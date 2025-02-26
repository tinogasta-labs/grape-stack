import { invariant } from '@epic-web/invariant'
import { redirect } from 'react-router'
import { requireAnonymous } from '~/utils/auth.server.js'
import { verifySessionStorage } from '~/utils/verify.server.js'
import { ONBOARDING_EMAIL_SESSION_KEY } from './onboarding.js'
import type { VerifyFunctionArgs } from './verify.server'

export async function handleVerification({ submission }: VerifyFunctionArgs) {
  invariant(
    submission.status === 'success',
    'Submission should be successful by now',
  )
  const verifySession = await verifySessionStorage.getSession()
  verifySession.set(ONBOARDING_EMAIL_SESSION_KEY, submission.value.target)
  return redirect('/onboarding', {
    headers: {
      'set-cookie': await verifySessionStorage.commitSession(verifySession),
    },
  })
}

export async function requireOnboardingEmail(request: Request) {
  await requireAnonymous(request)
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie'),
  )
  const email = verifySession.get(ONBOARDING_EMAIL_SESSION_KEY)
  if (typeof email !== 'string' || !email) {
    throw redirect('/signup')
  }
  return email
}
