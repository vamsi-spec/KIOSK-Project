import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import prisma from '../../lib/prisma.js'
import { auth } from '../../middleware/auth.middleware.js'
import { BILLING } from '../../constants/billing.js'

export const meterRouter = Router()

function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error:   'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    })
  }
  next()
}

// ── POST /electricity/meter/submit ──────────────────────────
meterRouter.post(
  '/submit',
  auth,
  [
    body('accountId').notEmpty().isUUID().withMessage('Valid account ID required'),
    body('readingValue').notEmpty().isFloat({ min: 0 }).withMessage('Reading must be positive')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { accountId, readingValue, photoUrl } = req.body

      const account = await prisma.serviceAccount.findFirst({
        where: { id: accountId, citizenId: req.citizen.id, serviceType: 'ELECTRICITY', isActive: true }
      })

      if (!account) {
        return res.status(404).json({ error: 'Account not found or not linked to your profile.', code: 'NOT_FOUND' })
      }

      // Check for existing PENDING reading
      const existingPending = await prisma.meterReading.findFirst({
        where: { accountId, verificationStatus: 'PENDING' },
        orderBy: { submittedAt: 'desc' }
      })

      if (existingPending) {
        return res.status(409).json({
          error: 'You already have a reading pending verification. Please wait for it to be verified before submitting another.',
          code:  'READING_PENDING_EXISTS'
        })
      }

      // Get last VERIFIED reading as baseline
      const lastVerifiedReading = await prisma.meterReading.findFirst({
        where:   { accountId, verificationStatus: 'VERIFIED' },
        orderBy: { submittedAt: 'desc' }
      })

      const previousReadingValue = lastVerifiedReading ? Number(lastVerifiedReading.readingValue) : 0
      const currentReading       = Number(readingValue)

      // Validation: cannot go backwards
      if (currentReading < previousReadingValue) {
        return res.status(422).json({
          error: `Reading cannot be less than the previous reading (${previousReadingValue} kWh). Please check your meter.`,
          code:  'READING_TOO_LOW'
        })
      }

      // Validation: suspiciously high value (10x previous)
      if (previousReadingValue > 0 && currentReading > previousReadingValue * 10) {
        return res.status(422).json({
          error: 'Reading seems unusually high. Please double-check the meter and try again.',
          code:  'READING_SUSPICIOUS'
        })
      }

      const unitsConsumed = Math.round((currentReading - previousReadingValue) * 100) / 100

      const reading = await prisma.meterReading.create({
        data: {
          accountId,
          citizenId:            req.citizen.id,
          readingValue:         currentReading,
          previousReadingValue,
          unitsConsumed,
          photoUrl:             photoUrl || null,
          verificationStatus:   'PENDING'
        }
      })

      await prisma.kioskLog.create({
        data: {
          kioskId:     req.kioskId,
          citizenId:   req.citizen.id,
          sessionId:   req.citizen.sessionId,
          action:      'METER_READING_SUBMITTED',
          serviceType: 'ELECTRICITY',
          metadata:    { accountId, accountNo: account.accountNo, readingValue: currentReading, previousReadingValue, unitsConsumed, readingId: reading.id }
        }
      })

      res.status(201).json({
        message:              'Meter reading submitted. It will be verified by our team within 1–2 working days.',
        readingId:            reading.id,
        readingValue:         currentReading,
        previousReadingValue,
        unitsConsumed,
        verificationStatus:   'PENDING',
        submittedAt:          reading.submittedAt
      })

    } catch (err) {
      next(err)
    }
  }
)

// ── GET /electricity/meter/history/:accountId ────────────────
meterRouter.get(
  '/history/:accountId',
  auth,
  [param('accountId').isUUID().withMessage('Invalid account ID')],
  validate,
  async (req, res, next) => {
    try {
      const { accountId } = req.params

      const account = await prisma.serviceAccount.findFirst({
        where: { id: accountId, citizenId: req.citizen.id, serviceType: 'ELECTRICITY' }
      })

      if (!account) {
        return res.status(404).json({ error: 'Account not found.', code: 'NOT_FOUND' })
      }

      const readings = await prisma.meterReading.findMany({
        where:   { accountId, verificationStatus: 'VERIFIED' },
        orderBy: { submittedAt: 'desc' },
        take:    BILLING.METER_HISTORY_COUNT,
        select: {
          id:                   true,
          readingValue:         true,
          previousReadingValue: true,
          unitsConsumed:        true,
          submittedAt:          true,
          verifiedAt:           true
        }
      })

      const pendingReading = await prisma.meterReading.findFirst({
        where:   { accountId, verificationStatus: 'PENDING' },
        orderBy: { submittedAt: 'desc' },
        select:  { id: true, readingValue: true, submittedAt: true }
      })

      res.status(200).json({
        accountNo:      account.accountNo,
        pendingReading: pendingReading
          ? { ...pendingReading, readingValue: Number(pendingReading.readingValue) }
          : null,
        readings: readings.map(r => ({
          ...r,
          readingValue:         Number(r.readingValue),
          previousReadingValue: Number(r.previousReadingValue),
          unitsConsumed:        Number(r.unitsConsumed)
        }))
      })

    } catch (err) {
      next(err)
    }
  }
)