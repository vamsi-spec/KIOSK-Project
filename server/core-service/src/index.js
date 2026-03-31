import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { createServer } from 'http'
import { healthRouter } from './healthcheck.js'

const app = express()
const httpServer = createServer(app)
const PORT = process.env.CORE_PORT || 3002

// ── Raw body capture for Razorpay webhook signature check ─
// Must be before express.json() for the webhook route only
app.use((req, res, next) => {
  if (req.path === '/payments/webhook') {
    express.raw({ type: 'application/json' })(req, res, next)
  } else {
    express.json()(req, res, next)
  }
})

// ── CORS — kiosk frontend only ────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

// ── HTTP logging ──────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Health check ──────────────────────────────────────────
app.use('/', healthRouter)

// ── Placeholder for Phase 5–11 routes ────────────────────
// Will add: /bills, /payments, /complaints, /connections, /meter
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    service: 'core-service',
    path: req.path
  })
})

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[core-service] Error on ${req.method} ${req.path}:`, err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'UNKNOWN'
  })
})

// ── Start HTTP server (wraps Express for Socket.io Phase 11) ─
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ core-service running on port ${PORT}`)
  console.log(`  Health: http://localhost:${PORT}/health`)
})