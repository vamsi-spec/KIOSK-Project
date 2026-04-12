import { Router } from 'express'
import { param, validationResult } from 'express-validator'
import prisma from '../../lib/prisma.js'
import { auth } from '../../middleware/auth.middleware.js'
import { enrichBill } from '../../helpers/lateFee.js'
import { BILLING } from '../../constants/billing.js'

export const billsRouter = Router()

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

// ── GET /electricity/bills/:accountId ──────────────────────
billsRouter.get(
  '/:accountId',
  auth,
  [param('accountId').isUUID().withMessage('Invalid account ID')],
  validate,
  async (req, res, next) => {
    try {
      const { accountId } = req.params

      const account = await prisma.serviceAccount.findFirst({
        where: {
          id:          accountId,
          citizenId:   req.citizen.id,
          serviceType: 'ELECTRICITY',
          isActive:    true
        }
      })

      if (!account) {
        return res.status(404).json({
          error: 'Account not found or not linked to your profile.',
          code:  'ACCOUNT_NOT_FOUND'
        })
      }

      const bills = await prisma.bill.findMany({
        where:   { accountId },
        orderBy: { generatedAt: 'desc' },
        take:    BILLING.BILL_HISTORY_COUNT,
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            select: {
              id:                true,
              amount:            true,
              status:            true,
              paymentMethod:     true,
              razorpayPaymentId: true,
              createdAt:         true
            }
          }
        }
      })

      const enrichedBills = await Promise.all(
        bills.map(b => enrichBill(b, account.providerName))
      )

      const pendingBills   = enrichedBills.filter(b =>
        ['PENDING', 'OVERDUE', 'PAYMENT_IN_PROGRESS', 'PARTIALLY_PAID'].includes(b.status)
      )
      const paidBills      = enrichedBills.filter(b => b.status === 'PAID')
      const hasBills       = bills.length > 0
      const hasPendingBills = pendingBills.length > 0

      const totalPaidThisYear = bills
        .filter(b => new Date(b.generatedAt).getFullYear() === new Date().getFullYear() && b.status === 'PAID')
        .reduce((sum, b) => sum + Number(b.amount), 0)

      // Clear distinction between "no bills" and "no pending bills"
      const billSummary = {
        hasBills,
        hasPendingBills,
        pendingCount:         pendingBills.length,
        totalPendingAmount:   Math.round(pendingBills.reduce((s, b) => s + b.totalPayable, 0) * 100) / 100,
        lastBillDate:         bills[0]?.period || null,
        lastPaidDate:         paidBills[0]
          ? bills.find(b => b.id === paidBills[0].id)?.generatedAt || null
          : null,
        totalPaidThisYear:    Math.round(totalPaidThisYear * 100) / 100
      }

      res.status(200).json({
        account: {
          id:           account.id,
          accountNo:    account.accountNo,
          providerName: account.providerName,
          address:      account.address
        },
        billSummary,
        bills: enrichedBills
      })

    } catch (err) {
      next(err)
    }
  }
)