import { Router } from 'express'

export const healthRouter = Router()

// ── GET /health — Docker and Nginx poll this ─────────────
healthRouter.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    env: process.env.NODE_ENV
  })
})