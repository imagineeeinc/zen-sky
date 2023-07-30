import { createServer } from 'node:https'
import { serve } from '@hono/node-server'

import * as app from './index.js'

var PORT = 3000 || process.env.PORT

serve({
  fetch: app.default.fetch,
  port: PORT
}, info=> {
  console.log(`Listening on port ${info.port}`)
})