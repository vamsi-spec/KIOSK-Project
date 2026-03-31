import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { healthRouter }        from './healthcheck.js'
import { registerRouter }      from './routes/register.route.js'
import { sendOtpRouter }       from './routes/sendOtp.route.js'
import { verifyOtpRouter }     from './routes/verifyOtp.route.js'
import { validateTokenRouter } from './routes/validateToken.route.js'
import { logoutRouter }        from './routes/logout.route.js'
import { checkMobileRouter } from './routes/checkMobile.route.js'
const app  = express()
const PORT = process.env.AUTH_PORT || 3001

// Parse JSON request bodies
app.use(express.json())

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests, please slow down.' }
})
app.use(globalLimiter)

// OTP limiter
const otpLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many OTP requests. Please wait a minute.' }
})

// Routes
app.use('/health',         healthRouter)
app.use('/auth/register',       otpLimiter, registerRouter)
app.use('/auth/send-otp',       otpLimiter, sendOtpRouter)
app.use('/auth/verify-otp',     verifyOtpRouter)
app.use('/auth/validate-token', validateTokenRouter)
app.use('/auth/logout',         logoutRouter)
app.use('/auth/check-mobile',checkMobileRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error:   'Route not found',
    service: 'auth-service',
    path:    req.path
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[auth-service] ${req.method} ${req.path}:`, err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code:  err.code    || 'UNKNOWN'
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ auth-service running on port ${PORT}`)
  console.log(`Env: ${process.env.NODE_ENV}`)
  console.log(`Routes: /register /send-otp /verify-otp /validate-token /logout`)
})