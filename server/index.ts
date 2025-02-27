import { Hono } from 'hono'
import { createHonoServer } from 'react-router-hono-server/node'

if (process.env.MOCKS === 'true') {
  await import('../tests/mocks/index')
}

export default await createHonoServer({
  app: new Hono(),
})
