import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    env: process.env.NODE_ENV
  })
})