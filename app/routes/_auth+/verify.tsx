import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, type MetaFunction, data, useSearchParams } from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { db } from '~/utils/db.server'
import { VerifyCodeSchema } from '~/utils/validation'
import type { Route } from './+types/verify'
import { handleVerification } from './onboarding.server'
import { isCodeValid } from './verify.server'

export const CODE_QUERY_PARAM = 'code'
export const TARGET_QUERY_PARAM = 'target'
export const TYPE_QUERY_PARAM = 'type'

const types = ['onboarding'] as const
const VerificationTypeSchema = z.enum(types)
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>

export const VerifyFormSchema = z.object({
  [CODE_QUERY_PARAM]: VerifyCodeSchema,
  [TARGET_QUERY_PARAM]: z.string(),
  [TYPE_QUERY_PARAM]: VerificationTypeSchema,
})

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = await parseWithZod(formData, {
    schema: VerifyFormSchema.superRefine(async (data, ctx) => {
      const codeIsValid = await isCodeValid({
        code: data[CODE_QUERY_PARAM],
        type: data[TYPE_QUERY_PARAM],
        target: data[TARGET_QUERY_PARAM],
      })
      if (!codeIsValid) {
        ctx.addIssue({
          path: ['code'],
          code: 'custom',
          message: 'Invalid code',
        })
        return
      }
    }),
    async: true,
  })
  if (submission.status !== 'success') {
    return data(
      { result: submission.reply() },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { value: submissionValue } = submission

  await db.verification.delete({
    where: {
      target_type: {
        type: submissionValue[TYPE_QUERY_PARAM],
        target: submissionValue[TARGET_QUERY_PARAM],
      },
    },
  })

  return handleVerification({ request, body: formData, submission })
}

export const meta: MetaFunction = () => [{ title: 'Verify | Grape Stack' }]

export default function VerfifyRoute({ actionData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams()
  const [form, fields] = useForm({
    id: 'verify-form',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: VerifyFormSchema })
    },
    defaultValue: {
      [CODE_QUERY_PARAM]: searchParams.get(CODE_QUERY_PARAM) ?? '',
      [TYPE_QUERY_PARAM]: searchParams.get(TYPE_QUERY_PARAM) ?? '',
      [TARGET_QUERY_PARAM]: searchParams.get(TARGET_QUERY_PARAM) ?? '',
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Confirm Email</h1>
      <p>We've sent you code to verify your email address.</p>
      <div className="mt-6 max-w-lg">
        <Form
          method="POST"
          {...getFormProps(form)}
          className="flex flex-col gap-2"
        >
          <input
            {...getInputProps(fields[TYPE_QUERY_PARAM], { type: 'hidden' })}
          />
          <input
            {...getInputProps(fields[TARGET_QUERY_PARAM], { type: 'hidden' })}
          />
          <div className="flex flex-col gap-2">
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your code"
              maxLength={6}
              {...getInputProps(fields[CODE_QUERY_PARAM], { type: 'text' })}
            />
            {JSON.stringify(fields[CODE_QUERY_PARAM].errors)}
          </div>
          {JSON.stringify(form.errors)}
          <button
            className="w-full cursor-pointer rounded-lg border bg-black py-3 text-white"
            type="submit"
          >
            Confirm
          </button>
        </Form>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
