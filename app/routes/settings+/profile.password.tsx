import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, data, redirect } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '~/components/forms'
import { Button, Input, Label } from '~/components/ui'
import {
  getPasswordHash,
  requireUserId,
  verifyUserPassword,
} from '~/utils/auth.server'
import { db } from '~/utils/db.server'
import {
  PasswordAndConfirmPasswordSchema,
  PasswordSchema,
} from '~/utils/validation'
import type { Route } from './+types/profile.password'

const ChangePasswordFormSchema = z
  .object({
    currentPassword: PasswordSchema,
  })
  .and(PasswordAndConfirmPasswordSchema)

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const submission = await parseWithZod(formData, {
    schema: ChangePasswordFormSchema.superRefine(async (data, ctx) => {
      if (data.currentPassword && data.password) {
        const user = await verifyUserPassword(
          { id: userId },
          data.currentPassword,
        )
        if (!user) {
          ctx.addIssue({
            path: ['currentPassword'],
            code: 'custom',
            message: 'Invalid password',
          })
        }
      }
    }),
    async: true,
  })
  if (submission.status !== 'success') {
    return data(
      {
        result: submission.reply({
          hideFields: ['currentPassword', 'password', 'confirmPassword'],
        }),
      },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { password: newPassword } = submission.value

  await db.user.update({
    select: { username: true },
    where: { id: userId },
    data: {
      password: {
        update: {
          hash: await getPasswordHash(newPassword),
        },
      },
    },
  })

  return redirect('/settings/profile', { status: 302 })
}

async function requirePassword(userId: string) {
  const password = await db.password.findUnique({
    select: { userId: true },
    where: { userId },
  })
  if (!password) {
    throw redirect('/settings/profile/password/create')
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  await requirePassword(userId)
  return {}
}

export default function ChangePasswordRoute({
  actionData,
}: Route.ComponentProps) {
  const [form, fields] = useForm({
    id: 'change-password-form',
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ChangePasswordFormSchema })
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  })
  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Change Password</h1>
      <div className="mt-6 max-w-lg">
        <Form
          {...getFormProps(form)}
          method="POST"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor={fields.currentPassword.id}>Current Password</Label>
            <Input
              {...getInputProps(fields.currentPassword, { type: 'password' })}
              placeholder="Enter your password"
            />
            <ErrorList
              errors={fields.currentPassword.errors}
              id={fields.currentPassword.errorId}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={fields.password.id}>New Password</Label>
            <Input
              {...getInputProps(fields.password, { type: 'password' })}
              placeholder="Enter the new password"
            />
            <ErrorList
              errors={fields.password.errors}
              id={fields.password.errorId}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={fields.confirmPassword.id}>Confirm Password</Label>
            <Input
              {...getInputProps(fields.confirmPassword, { type: 'password' })}
              placeholder="Confirm the new password"
            />
            <ErrorList
              errors={fields.confirmPassword.errors}
              id={fields.confirmPassword.errorId}
            />
          </div>

          <ErrorList errors={form.errors} id={form.errorId} />
          <Button type="submit">Change password</Button>
        </Form>
      </div>
    </div>
  )
}
