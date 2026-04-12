import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { createServer } from 'http'
import { healthRouter }          from './healthcheck.js'
import { electricityRouter }     from './routes/electricity/index.js'
import { resetTimedOutPayments } from './jobs/paymentTimeout.job.js'
import { BILLING }               from './constants/billing.js'

const app        = express()
const httpServer = createServer(app)
const PORT       = process.env.CORE_PORT || 3002

app.use((req, res, next) => {
  if (req.path.includes('/payments/webhook')) {
    express.raw({ type: 'application/json' })(req, res, next)
  } else {
    express.json()(req, res, next)
  }
})

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use('/health',      healthRouter)
app.use('/electricity', electricityRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', service: 'core-service', path: req.path })
})

app.use((err, req, res, next) => {
  console.error(`[core-service] ${req.method} ${req.path}:`, err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code:  err.code    || 'UNKNOWN'
  })
})

httpServer.listen(PORT, () => {
  console.log(`✓ core-service running on port ${PORT}`)
  const intervalMs = BILLING.PAYMENT_RESET_JOB_INTERVAL_MINUTES * 60 * 1000
  setInterval(resetTimedOutPayments, intervalMs)
  console.log(`✓ Payment timeout job: every ${BILLING.PAYMENT_RESET_JOB_INTERVAL_MINUTES} min`)
})