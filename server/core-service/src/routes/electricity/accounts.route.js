import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../../lib/prisma.js'
import { auth } from '../../middleware/auth.middleware.js'
import { enrichBill } from '../../helpers/lateFee.js'
import { BILLING } from '../../constants/billing.js'
import { generateVerificationRefNo } from '../../helpers/refNo.js'
import redis from '../../lib/redis.js'

export const accountsRouter = Router()

// Provider options for the kiosk dropdown
// Shown when citizen selects their provider during verification request
export const ELECTRICITY_PROVIDERS = [
  'TSSPDCL',
  'TSNPDCL',
  'APEPDCL',
  'APSPDCL',
  'GESCOM',
  'HESCOM',
  'BESCOM',
  'Other'
]

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

const bcryptHash    = (v) => bcrypt.hash(v, 10)
const bcryptCompare = (v, h) => bcrypt.compare(v, h)

const linkOtpKey      = (mobile) => `link_otp:${mobile}`
const linkCooldownKey = (mobile) => `link_cooldown:${mobile}`
const linkContextKey  = (mobile) => `link_ctx:${mobile}`

// ── GET /electricity/accounts/mine ─────────────────────────
// Auto-fetched on every AccountsScreen mount
// Returns all linked accounts with inline bill summaries
accountsRouter.get('/mine', auth, async (req, res, next) => {
  try {
    const accounts = await prisma.serviceAccount.findMany({
      where: {
        citizenId:   req.citizen.id,
        serviceType: 'ELECTRICITY',
        isActive:    true
      },
      include: {
        bills: {
          orderBy: { generatedAt: 'desc' },
          take:    3,
          include: {
            transactions: {
              where:   { status: 'SUCCESS' },
              orderBy: { createdAt: 'desc' },
              take:    1,
              select:  { amount: true, createdAt: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const enrichedAccounts = await Promise.all(
      accounts.map(async (acc) => {
        const allBills    = acc.bills
        const pendingBill = allBills.find(b =>
          ['PENDING', 'OVERDUE', 'PAYMENT_IN_PROGRESS', 'PARTIALLY_PAID'].includes(b.status)
        )
        const enriched   = pendingBill ? await enrichBill(pendingBill, acc.providerName) : null
        const paidBills  = allBills.filter(b => b.status === 'PAID')

        return {
          id:           acc.id,
          accountNo:    acc.accountNo,
          providerName: acc.providerName,
          address:      acc.address,
          billSummary: {
            hasBills:        allBills.length > 0,
            hasPendingBills: !!pendingBill,
            pendingBill:     enriched,
            lastPaidDate:    paidBills[0]?.transactions[0]?.createdAt || null,
            totalBillCount:  allBills.length
          }
        }
      })
    )

    res.status(200).json({ accounts: enrichedAccounts })
  } catch (err) {
    next(err)
  }
})

// ── POST /electricity/accounts/verify-ownership ─────────────
// Citizen enters consumer number from physical bill
// CASE 1: Found + mobile matches    → direct link
// CASE 2: Found + mobile no match   → OTP to registeredMobile
// CASE 3: Not found + has request   → return request status
// CASE 4: Not found + no request    → prompt verification form
accountsRouter.post(
  '/verify-ownership',
  auth,
  [body('consumerNo').trim().notEmpty().withMessage('Consumer number is required')],
  validate,
  async (req, res, next) => {
    try {
      const { consumerNo } = req.body

      const serviceAccount = await prisma.serviceAccount.findFirst({
        where: {
          accountNo:   consumerNo.trim(),
          serviceType: 'ELECTRICITY',
          isActive:    true
        }
      })

      // ── CASE: Not in DB ────────────────────────────────────
      if (!serviceAccount) {
        // Check if citizen already submitted a verification request
        const existingRequest = await prisma.accountVerificationRequest.findFirst({
          where: {
            consumerNo:  consumerNo.trim(),
            serviceType: 'ELECTRICITY',
            citizenId:   req.citizen.id
          },
          orderBy: { createdAt: 'desc' }
        })

        if (existingRequest) {
          return res.status(200).json({
            found: false,
            verificationRequest: {
              exists:       true,
              status:       existingRequest.status,
              refNo:        existingRequest.refNo,
              submittedAt:  existingRequest.createdAt,
              remarks:      existingRequest.remarks || null,
              canRetryLink: existingRequest.status === 'APPROVED'
            }
          })
        }

        // No request exists — prompt citizen to submit details
        return res.status(200).json({
          found: false,
          verificationRequest: { exists: false },
          // Tell frontend which providers to show in dropdown
          availableProviders: ELECTRICITY_PROVIDERS,
          message: 'Consumer number not in system. Please submit your account details for verification.'
        })
      }

      // ── CASE: Already linked to this citizen ───────────────
      if (serviceAccount.citizenId === req.citizen.id) {
        return res.status(409).json({
          error: 'This account is already linked to your profile.',
          code:  'ALREADY_LINKED'
        })
      }

      // ── CASE: Mobile matches → direct link ─────────────────
      if (req.citizen.mobile === serviceAccount.registeredMobile) {
        await prisma.serviceAccount.update({
          where: { id: serviceAccount.id },
          data:  { citizenId: req.citizen.id }
        })

        await prisma.kioskLog.create({
          data: {
            kioskId:     req.kioskId,
            citizenId:   req.citizen.id,
            sessionId:   req.citizen.sessionId,
            action:      'ACCOUNT_LINKED_DIRECT',
            serviceType: 'ELECTRICITY',
            metadata:    { accountNo: consumerNo, method: 'mobile_match' }
          }
        })

        return res.status(200).json({
          found:       true,
          linked:      true,
          requiresOtp: false,
          message:     'Account linked successfully.',
          account: {
            id:           serviceAccount.id,
            accountNo:    serviceAccount.accountNo,
            providerName: serviceAccount.providerName,
            address:      serviceAccount.address
          }
        })
      }

      // ── CASE: Mobile no match → OTP to registeredMobile ────
      const registeredMobile = serviceAccount.registeredMobile

      const cooldown = await redis.get(linkCooldownKey(registeredMobile))
      if (cooldown) {
        const ttl = await redis.ttl(linkCooldownKey(registeredMobile))
        return res.status(429).json({
          error: `OTP already sent. Please wait ${ttl} seconds.`,
          code:  'OTP_COOLDOWN'
        })
      }

      const otp  = crypto.randomInt(100000, 999999).toString()
      const hash = await bcryptHash(otp)

      await Promise.all([
        redis.setex(linkOtpKey(registeredMobile),      BILLING.LINK_OTP_TTL_SECONDS,      hash),
        redis.setex(linkCooldownKey(registeredMobile),  BILLING.LINK_OTP_COOLDOWN_SECONDS, '1'),
        redis.setex(linkContextKey(registeredMobile),   BILLING.LINK_OTP_TTL_SECONDS, JSON.stringify({
          citizenId:  req.citizen.id,
          accountId:  serviceAccount.id,
          consumerNo: serviceAccount.accountNo
        }))
      ])

      if (process.env.NODE_ENV !== 'production') {
        console.log('━'.repeat(55))
        console.log(`[LINK OTP DEV] To: ${registeredMobile}  OTP: ${otp}`)
        console.log(`[LINK OTP DEV] Consumer: ${consumerNo}`)
        console.log('━'.repeat(55))
      }
      // Production: send SMS to registeredMobile via Twilio

      return res.status(200).json({
        found:        true,
        linked:       false,
        requiresOtp:  true,
        maskedMobile: `XXXXXX${registeredMobile.slice(-4)}`,
        expiresIn:    BILLING.LINK_OTP_TTL_SECONDS,
        message:      'OTP sent to the mobile number registered with this account.'
      })

    } catch (err) {
      next(err)
    }
  }
)

// ── POST /electricity/accounts/confirm-link ─────────────────
// Citizen submits OTP received on the registeredMobile
accountsRouter.post(
  '/confirm-link',
  auth,
  [
    body('consumerNo').trim().notEmpty().withMessage('Consumer number is required'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be 6 digits')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { consumerNo, otp } = req.body

      const serviceAccount = await prisma.serviceAccount.findFirst({
        where: { accountNo: consumerNo.trim(), serviceType: 'ELECTRICITY', isActive: true }
      })

      if (!serviceAccount) {
        return res.status(404).json({ error: 'Account not found.', code: 'NOT_FOUND' })
      }

      const registeredMobile = serviceAccount.registeredMobile

      const contextRaw = await redis.get(linkContextKey(registeredMobile))
      if (!contextRaw) {
        return res.status(400).json({
          error: 'OTP has expired. Please restart the linking process.',
          code:  'OTP_EXPIRED'
        })
      }

      const context = JSON.parse(contextRaw)
      if (context.citizenId !== req.citizen.id) {
        return res.status(403).json({ error: 'Unauthorized.', code: 'UNAUTHORIZED' })
      }

      const storedHash = await redis.get(linkOtpKey(registeredMobile))
      if (!storedHash) {
        return res.status(400).json({
          error: 'OTP has expired. Please restart the linking process.',
          code:  'OTP_EXPIRED'
        })
      }

      const isValid = await bcryptCompare(otp, storedHash)
      if (!isValid) {
        return res.status(401).json({ error: 'Incorrect OTP. Please try again.', code: 'INVALID_OTP' })
      }

      await prisma.serviceAccount.update({
        where: { id: context.accountId },
        data:  { citizenId: req.citizen.id }
      })

      await Promise.all([
        redis.del(linkOtpKey(registeredMobile)),
        redis.del(linkContextKey(registeredMobile))
      ])

      await prisma.kioskLog.create({
        data: {
          kioskId:     req.kioskId,
          citizenId:   req.citizen.id,
          sessionId:   req.citizen.sessionId,
          action:      'ACCOUNT_LINKED_OTP',
          serviceType: 'ELECTRICITY',
          metadata:    { accountNo: consumerNo, method: 'otp_verified' }
        }
      })

      res.status(200).json({
        linked:  true,
        message: 'Account linked successfully.',
        account: {
          id:           serviceAccount.id,
          accountNo:    serviceAccount.accountNo,
          providerName: serviceAccount.providerName,
          address:      serviceAccount.address
        }
      })

    } catch (err) {
      next(err)
    }
  }
)

// ── POST /electricity/accounts/request-verification ─────────
// Account not in DB — citizen submits details for admin to verify
// providerName is NOW REQUIRED — admin needs it to check utility records
accountsRouter.post(
  '/request-verification',
  auth,
  [
    body('consumerNo')
      .trim()
      .notEmpty().withMessage('Consumer number is required'),

    body('accountHolderName')
      .trim()
      .notEmpty().withMessage('Account holder name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

    body('registeredMobile')
      .trim()
      .matches(/^[6-9]\d{9}$/).withMessage('Enter the 10-digit mobile registered with your provider'),

    body('address')
      .trim()
      .notEmpty().withMessage('Address is required')
      .isLength({ min: 10, max: 300 }).withMessage('Address must be 10–300 characters'),

    // providerName — required so admin knows which utility's records to check
    // This is what was MISSING before — now correctly collected
    body('providerName')
      .trim()
      .notEmpty().withMessage('Please select your electricity provider')
      .isLength({ max: 100 }).withMessage('Provider name too long')
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        consumerNo,
        accountHolderName,
        registeredMobile,
        address,
        providerName,
        proofDocUrl        // Phase 10 — Cloudinary URL
      } = req.body

      // Prevent duplicate PENDING requests for same consumer no
      const existing = await prisma.accountVerificationRequest.findFirst({
        where: {
          consumerNo:  consumerNo.trim(),
          serviceType: 'ELECTRICITY',
          citizenId:   req.citizen.id,
          status:      'PENDING'
        }
      })

      if (existing) {
        return res.status(409).json({
          error: 'You already have a pending verification request for this consumer number.',
          code:  'REQUEST_EXISTS',
          refNo: existing.refNo
        })
      }

      const refNo = await generateVerificationRefNo()

      const request = await prisma.accountVerificationRequest.create({
        data: {
          citizenId:         req.citizen.id,
          serviceType:       'ELECTRICITY',
          consumerNo:        consumerNo.trim(),
          accountHolderName: accountHolderName.trim(),
          registeredMobile,
          address:           address.trim(),
          providerName:      providerName.trim(),   // ← stored, used by admin in Phase 12
          proofDocUrl:       proofDocUrl || null,
          status:            'PENDING',
          refNo
        }
      })

      await prisma.kioskLog.create({
        data: {
          kioskId:     req.kioskId,
          citizenId:   req.citizen.id,
          sessionId:   req.citizen.sessionId,
          action:      'ACCOUNT_VERIFICATION_REQUESTED',
          serviceType: 'ELECTRICITY',
          metadata:    { consumerNo, refNo, providerName }
        }
      })

      res.status(201).json({
        message:     'Verification request submitted. Our team will verify within 1–2 working days.',
        refNo:       request.refNo,
        status:      'PENDING',
        submittedAt: request.createdAt
      })

    } catch (err) {
      next(err)
    }
  }
)

// ── GET /electricity/accounts/verification-status/:refNo ────
accountsRouter.get('/verification-status/:refNo', auth, async (req, res, next) => {
  try {
    const request = await prisma.accountVerificationRequest.findFirst({
      where: {
        refNo:     req.params.refNo.toUpperCase(),
        citizenId: req.citizen.id
      }
    })

    if (!request) {
      return res.status(404).json({ error: 'Verification request not found.', code: 'NOT_FOUND' })
    }

    let linkable = false
    if (request.status === 'APPROVED') {
      const account = await prisma.serviceAccount.findFirst({
        where: { accountNo: request.consumerNo, serviceType: 'ELECTRICITY', isActive: true }
      })
      linkable = !!account
    }

    res.status(200).json({
      refNo:             request.refNo,
      consumerNo:        request.consumerNo,
      accountHolderName: request.accountHolderName,
      providerName:      request.providerName,
      address:           request.address,
      status:            request.status,
      remarks:           request.remarks || null,
      submittedAt:       request.createdAt,
      reviewedAt:        request.reviewedAt || null,
      linkable
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /electricity/accounts/providers ─────────────────────
// Returns available provider list for the dropdown
accountsRouter.get('/providers', (req, res) => {
  res.status(200).json({ providers: ELECTRICITY_PROVIDERS })
})