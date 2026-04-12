import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../../lib/prisma.js'
import { auth } from '../../middleware/auth.middleware.js'
import { generateComplaintRefNo } from '../../helpers/refNo.js'

export const complaintRouter = Router()

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

const ELECTRICITY_CATEGORIES = [
  'Power outage',
  'Voltage fluctuation',
  'Meter fault',
  'Billing error',
  'Transformer issue',
  'Line damage',
  'Street light issue',
  'Other'
]

// ── POST /electricity/complaints ────────────────────────────
complaintRouter.post(
  '/',
  auth,
  [
    body('category').notEmpty().isIn(ELECTRICITY_CATEGORIES).withMessage('Invalid category'),
    body('description').trim().notEmpty().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10–1000 characters')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { category, description, docUrl } = req.body
      const refNo = await generateComplaintRefNo()

      const complaint = await prisma.complaint.create({
        data: {
          citizenId:   req.citizen.id,
          serviceType: 'ELECTRICITY',
          category,
          description: description.trim(),
          docUrl:      docUrl || null,
          status:      'SUBMITTED',
          refNo
        }
      })

      await prisma.kioskLog.create({
        data: {
          kioskId:     req.kioskId,
          citizenId:   req.citizen.id,
          sessionId:   req.citizen.sessionId,
          action:      'COMPLAINT_FILED',
          serviceType: 'ELECTRICITY',
          metadata:    { refNo, category }
        }
      })

      res.status(201).json({
        message:     'Complaint filed successfully.',
        refNo:       complaint.refNo,
        status:      complaint.status,
        category:    complaint.category,
        submittedAt: complaint.createdAt
      })

    } catch (err) {
      next(err)
    }
  }
)

// ── GET /electricity/complaints/:refNo ──────────────────────
complaintRouter.get('/:refNo', async (req, res, next) => {
  try {
    const complaint = await prisma.complaint.findFirst({
      where: { refNo: req.params.refNo.toUpperCase(), serviceType: 'ELECTRICITY' },
      select: {
        refNo: true, category: true, description: true, status: true,
        assignedTo: true, resolutionNote: true, createdAt: true, resolvedAt: true
      }
    })

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found. Check your reference number.', code: 'NOT_FOUND' })
    }

    res.status(200).json(complaint)
  } catch (err) {
    next(err)
  }
})

// ── GET /electricity/complaints/mine/all ────────────────────
complaintRouter.get('/mine/all', auth, async (req, res, next) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where:   { citizenId: req.citizen.id, serviceType: 'ELECTRICITY' },
      orderBy: { createdAt: 'desc' },
      select:  { refNo: true, category: true, status: true, createdAt: true, resolvedAt: true }
    })
    res.status(200).json({ complaints })
  } catch (err) {
    next(err)
  }
})