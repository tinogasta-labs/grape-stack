import { invariant } from '@epic-web/invariant'
import { redirect } from 'react-router'
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
