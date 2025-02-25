import { isbot } from 'isbot'
import type { RenderToPipeableStreamOptions } from 'react-dom/server'
import type { AppLoadContext, EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'
import { getPublicEnv, initEnv } from './utils/env.server'

export const streamTimeout = 5_000

initEnv()
global.ENV = getPublicEnv()

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  const userAgent = request.headers.get('user-agent')

  // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
  // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
  const readyOption: keyof RenderToPipeableStreamOptions =
    (userAgent && isbot(userAgent)) || routerContext.isSpaMode
      ? 'onAllReady'
      : 'onShellReady'

  // if renderToReadableStream exists and uses it. If it does not exist, it falls back to renderToPipeableStream
  // Bun, Browser, Cloudflare Edge, Cloudflare Worker, Deno implementations of react-dom/server support
  // renderToReadableStream. It would nice to support the spec compliant streams.
  const reactServer = await import('react-dom/server')
  if ('renderToReadableStream' in reactServer) {
    return handleReadableStream(
      reactServer,
      request,
      routerContext,
      responseHeaders,
      responseStatusCode,
      readyOption,
    )
  }

  return handlePipeableStream(
    request,
    routerContext,
    responseHeaders,
    responseStatusCode,
    readyOption,
  )
}

/**
 * Handles rendering with `renderToReadableStream`, used in modern environments like Cloudflare Workers, Deno, and Bun.
 */
async function handleReadableStream(
  reactServer: typeof import('react-dom/server'),
  request: Request,
  routerContext: EntryContext,
  responseHeaders: Headers,
  responseStatusCode: number,
  readyOption: keyof RenderToPipeableStreamOptions,
) {
  let didError = false
  const { renderToReadableStream } = reactServer
  const stream = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError: () => {
        didError = true
      },
    },
  )

  if (readyOption) {
    await stream.allReady
  }

  responseHeaders.set('Content-Type', 'text/html')
  return new Response(stream, {
    headers: responseHeaders,
    status: didError ? 500 : responseStatusCode,
  })
}

/**
 * Handles rendering with `renderToPipeableStream`, used in Node.js-based environments.
 * Vite uses Node.js for SSR in development mode, which can lead to compatibility issues with Bun.
 */
async function handlePipeableStream(
  request: Request,
  routerContext: EntryContext,
  responseHeaders: Headers,
  responseStatusCode: number,
  readyOption: keyof RenderToPipeableStreamOptions,
) {
  let didError = false
  const { PassThrough } = await import('node:stream')
  const { renderToPipeableStream } = await import('react-dom/server')
  const { createReadableStreamFromReadable } = await import(
    '@react-router/node'
  )

  return new Promise<Response>((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]: () => {
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)
          responseHeaders.set('Content-Type', 'text/html')
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            }),
          )
          pipe(body)
        },
        onShellError: reject,
        onError: () => {
          didError = true
        },
      },
    )
    setTimeout(abort, streamTimeout + 1000)
  })
}
