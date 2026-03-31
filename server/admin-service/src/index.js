import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { healthRouter } from './healthcheck.js'

const app = express()
const PORT = process.env.ADMIN_PORT || 3003

// ── JSON body parser ──────────────────────────────────────
app.use(express.json())

// ── CORS — admin dashboard frontend only ──────────────────
// Admin dashboard runs on a separate port from the kiosk UI
app.use(cors({
  origin: process.env.FRONTEND_ADMIN_URL || 'http://localhost:5174',
  credentials: true
}))

// ── HTTP logging ──────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Health check ──────────────────────────────────────────
app.use('/', healthRouter)

// ── Placeholder for Phase 12 routes ──────────────────────
// Will add: /auth/login, /transactions, /complaints, /analytics, /services
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    service: 'admin-service',
    path: req.path
  })
})

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[admin-service] Error on ${req.method} ${req.path}:`, err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'UNKNOWN'
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ admin-service running on port ${PORT}`)
  console.log(`  Health: http://localhost:${PORT}/health`)
})