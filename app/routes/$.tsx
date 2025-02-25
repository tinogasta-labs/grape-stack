import { Link, useLocation } from 'react-router'
import { GeneralErrorBoundary } from '~/components/error-boundary'

export async function loader() {
  throw new Response('Not found', { status: 404 })
}

export default function NotFoundRoute() {
  return <ErrorBoundary />
}

function NotFound() {
  const location = useLocation()
  return (
    <div className="p-4">
      <h1 className="text-lg">Upss!</h1>
      <pre className="py-2">
        <code>{location.pathname}</code>
      </pre>
      <p>We don't have anything here yet!</p>
      <div className="mt-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="mb-px">&larr;</span>
          <span className="underline">Back to home</span>
        </Link>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary statusHandlers={{ 404: () => <NotFound /> }} />
}
