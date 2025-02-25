import { Hono } from 'hono'
import { createHonoServer } from 'react-router-hono-server/bun'

export default await createHonoServer({
  app: new Hono(),
})
