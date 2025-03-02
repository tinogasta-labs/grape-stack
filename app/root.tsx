import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router'
import './app.css'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { GeneralErrorBoundary } from './components/error-boundary'
import { getPublicEnv } from './utils/env.server'
import { honeypot } from './utils/honeypot.server'

export async function loader() {
  return {
    env: getPublicEnv(),
    honeyProps: await honeypot.getInputProps(),
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { env } = useLoaderData()
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: expose public env
          dangerouslySetInnerHTML={{
            __html: `window.ENV=${JSON.stringify(env)}`,
          }}
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

function AppWithProviders() {
  const data = useLoaderData<typeof loader>()
  return (
    <HoneypotProvider {...data.honeyProps}>
      <Outlet />
    </HoneypotProvider>
  )
}

export default AppWithProviders

export const ErrorBoundary = GeneralErrorBoundary
