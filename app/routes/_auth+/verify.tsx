import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, data, redirect } from 'react-router'
import { z } from 'zod'
import { VerifyCodeSchema } from '~/utils/validation'
import type { Route } from './+types/verify'

const VerifyFormSchema = z.object({
  code: VerifyCodeSchema,
})

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = parseWithZod(formData, { schema: VerifyFormSchema })
  if (submission.status !== 'success') {
    return data(
      { result: submission.reply() },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  // TODO

  return redirect('/onboarding')
}

export default function VerfifyRoute({ actionData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    id: 'verify-form',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: VerifyFormSchema })
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
          <div className="flex flex-col gap-2">
            <input
              className="w-full rounded-lg border px-2 py-3"
              placeholder="Enter your email"
              maxLength={6}
              {...getInputProps(fields.code, { type: 'text' })}
            />
            {JSON.stringify(fields.code.errors)}
          </div>
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
