import { Hono } from 'hono'
import { createHonoServer } from 'react-router-hono-server/node'

export default await createHonoServer({
  app: new Hono(),
})
