import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import prisma from '../../lib/prisma.js'
import { auth } from '../../middleware/auth.middleware.js'

export const paymentRouter = Router()

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder'
})

const createOrderLimiter = rateLimit({
  windowMs: 60 * 1000, max: 3,
  message:  { error: 'Too many payment attempts. Please wait a minute.' }
})

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message:  { error: 'Too many verification requests.' }
})

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

// ── POST /electricity/payments/create-order ─────────────────
paymentRouter.post(
  '/create-order',
  auth,
  createOrderLimiter,
  [body('billId').notEmpty().isUUID().withMessage('Valid bill ID required')],
  validate,
  async (req, res, next) => {
    try {
      const { billId } = req.body

      const bill = await prisma.bill.findFirst({
        where: {
          id:      billId,
          account: { citizenId: req.citizen.id, serviceType: 'ELECTRICITY' }
        },
        include: { account: { select: { id: true, accountNo: true, providerName: true } } }
      })

      if (!bill) return res.status(404).json({ error: 'Bill not found.', code: 'BILL_NOT_FOUND' })
      if (bill.status === 'PAID') return res.status(400).json({ error: 'This bill has already been paid.', code: 'ALREADY_PAID' })
      if (bill.status === 'PAYMENT_IN_PROGRESS') return res.status(400).json({ error: 'A payment is already in progress for this bill.', code: 'PAYMENT_IN_PROGRESS' })
      if (!['PENDING', 'OVERDUE'].includes(bill.status)) return res.status(400).json({ error: 'Bill is not payable in its current state.', code: 'NOT_PAYABLE' })

      // Idempotency — return existing order if INITIATED transaction exists
      const existingTxn = await prisma.transaction.findFirst({
        where: { billId, status: 'INITIATED' },
        orderBy: { createdAt: 'desc' }
      })

      if (existingTxn) {
        return res.status(200).json({
          orderId:    existingTxn.razorpayOrderId,
          amount:     Math.round(Number(bill.amount) * 100),
          currency:   'INR',
          keyId:      process.env.RAZORPAY_KEY_ID,
          idempotent: true,
          bill:    { billNo: bill.billNo, period: bill.period, amount: Number(bill.amount) },
          citizen: { name: req.citizen.name, mobile: req.citizen.mobile }
        })
      }

      // Atomic lock — prevents race conditions
      const lockResult = await prisma.bill.updateMany({
        where: { id: billId, status: { in: ['PENDING', 'OVERDUE'] } },
        data:  { status: 'PAYMENT_IN_PROGRESS' }
      })

      if (lockResult.count === 0) {
        return res.status(409).json({ error: 'Payment already initiated. Please wait.', code: 'CONCURRENT_PAYMENT' })
      }

      let razorpayOrder
      try {
        razorpayOrder = await razorpay.orders.create({
          amount:   Math.round(Number(bill.amount) * 100),
          currency: 'INR',
          receipt:  billId,
          notes:    { billNo: bill.billNo, citizenId: req.citizen.id, kioskId: req.kioskId, service: 'ELECTRICITY' }
        })
      } catch (razorpayErr) {
        // Revert lock on Razorpay failure
        await prisma.bill.update({ where: { id: billId }, data: { status: bill.status } })
        throw razorpayErr
      }

      await prisma.transaction.create({
        data: {
          billId,
          citizenId:       req.citizen.id,
          razorpayOrderId: razorpayOrder.id,
          amount:          bill.amount,
          status:          'INITIATED'
        }
      })

      await prisma.kioskLog.create({
        data: {
          kioskId:     req.kioskId,
          citizenId:   req.citizen.id,
          sessionId:   req.citizen.sessionId,
          action:      'PAYMENT_INITIATED',
          serviceType: 'ELECTRICITY',
          metadata:    { billId, billNo: bill.billNo, amount: Number(bill.amount), orderId: razorpayOrder.id }
        }
      })

      res.status(200).json({
        orderId:  razorpayOrder.id,
        amount:   Math.round(Number(bill.amount) * 100),
        currency: 'INR',
        keyId:    process.env.RAZORPAY_KEY_ID,
        bill:    { billNo: bill.billNo, period: bill.period, amount: Number(bill.amount) },
        citizen: { name: req.citizen.name, mobile: req.citizen.mobile }
      })

    } catch (err) {
      next(err)
    }
  }
)

// ── POST /electricity/payments/verify-payment ───────────────
// React calls this BEFORE showing success — validates signature
// Does NOT update DB — webhook handles that
paymentRouter.post(
  '/verify-payment',
  auth,
  verifyLimiter,
  [
    body('razorpayOrderId')  .notEmpty().withMessage('Order ID required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID required'),
    body('razorpaySignature').notEmpty().withMessage('Signature required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex')

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpaySignature)
      )

      if (!isValid) {
        return res.status(400).json({ verified: false, error: 'Payment signature verification failed.', code: 'INVALID_SIGNATURE' })
      }

      const transaction = await prisma.transaction.findFirst({
        where:  { razorpayOrderId },
        select: { id: true, billId: true, amount: true }
      })

      res.status(200).json({
        verified:      true,
        transactionId: transaction?.id   || null,
        billId:        transaction?.billId || null,
        amount:        transaction ? Number(transaction.amount) : null
      })

    } catch (err) {
      next(err)
    }
  }
)

// ── POST /electricity/payments/cancel-order ─────────────────
// Called when citizen dismisses Razorpay modal
paymentRouter.post(
  '/cancel-order',
  auth,
  [body('orderId').notEmpty().withMessage('Order ID required')],
  validate,
  async (req, res, next) => {
    try {
      const { orderId } = req.body

      const transaction = await prisma.transaction.findFirst({
        where:   { razorpayOrderId: orderId, status: 'INITIATED' },
        include: { bill: { select: { id: true, dueDate: true } } }
      })

      if (!transaction) return res.status(200).json({ cancelled: true })

      const isOverdue    = transaction.bill?.dueDate && new Date(transaction.bill.dueDate) < new Date()
      const revertStatus = isOverdue ? 'OVERDUE' : 'PENDING'

      await prisma.$transaction([
        prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } }),
        prisma.bill.update({ where: { id: transaction.billId }, data: { status: revertStatus } })
      ])

      res.status(200).json({ cancelled: true })
    } catch (err) {
      next(err)
    }
  }
)

// ── POST /electricity/payments/webhook ──────────────────────
// Razorpay calls this — source of truth for DB updates
paymentRouter.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature']
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex')

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(signature || '')
    )

    if (!isValid) {
      console.error('[webhook] Invalid signature')
      return res.status(400).json({ error: 'Invalid webhook signature' })
    }

    const event   = JSON.parse(req.body.toString())
    const payment = event.payload?.payment?.entity

    if (!payment) return res.status(200).json({ received: true })

    const orderId   = payment.order_id
    const paymentId = payment.id
    const method    = payment.method

    // Idempotency check
    const alreadyProcessed = await prisma.transaction.findFirst({
      where: { razorpayPaymentId: paymentId }
    })
    if (alreadyProcessed) return res.status(200).json({ received: true, duplicate: true })

    const transaction = await prisma.transaction.findFirst({
      where:   { razorpayOrderId: orderId },
      include: { bill: { select: { id: true, dueDate: true } } }
    })

    if (!transaction) return res.status(200).json({ received: true })

    if (event.event === 'payment.captured') {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transaction.id },
          data:  { status: 'SUCCESS', razorpayPaymentId: paymentId, paymentMethod: method }
        }),
        prisma.bill.update({
          where: { id: transaction.billId },
          data:  { status: 'PAID' }
        }),
        prisma.kioskLog.create({
          data: {
            kioskId:     payment.notes?.kioskId || 'WEBHOOK',
            citizenId:   transaction.citizenId,
            action:      'PAYMENT_SUCCESS',
            serviceType: 'ELECTRICITY',
            metadata:    { orderId, paymentId, amount: Number(transaction.amount), method }
          }
        })
      ])
    } else if (event.event === 'payment.failed') {
      const isOverdue = transaction.bill?.dueDate && new Date(transaction.bill.dueDate) < new Date()
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transaction.id },
          data:  { status: 'FAILED', razorpayPaymentId: paymentId }
        }),
        prisma.bill.update({
          where: { id: transaction.billId },
          data:  { status: isOverdue ? 'OVERDUE' : 'PENDING' }
        })
      ])
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('[webhook] Error:', err.message)
    res.status(200).json({ received: true, error: err.message })
  }
})

// ── GET /electricity/payments/:transactionId ────────────────
paymentRouter.get('/:transactionId', auth, async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where:   { id: req.params.transactionId, citizenId: req.citizen.id, status: 'SUCCESS' },
      include: {
        bill: {
          select: {
            billNo: true, period: true,
            account: { select: { accountNo: true, providerName: true, address: true } }
          }
        }
      }
    })

    if (!transaction) return res.status(404).json({ error: 'Transaction not found.', code: 'NOT_FOUND' })

    res.status(200).json({
      id:                transaction.id,
      amount:            Number(transaction.amount),
      status:            transaction.status,
      paymentMethod:     transaction.paymentMethod,
      razorpayPaymentId: transaction.razorpayPaymentId,
      createdAt:         transaction.createdAt,
      bill:              transaction.bill
    })
  } catch (err) {
    next(err)
  }
})