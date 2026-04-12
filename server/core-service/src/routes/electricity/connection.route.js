import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../../lib/prisma.js'
import { auth } from '../../middleware/auth.middleware.js'
import { generateConnectionRefNo } from '../../helpers/refNo.js'

export const connectionRouter = Router()

const PROPERTY_TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL']

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

// ── POST /electricity/connections/apply ──────────────────────
// For houses with NO electricity connection yet
// providerName is OPTIONAL — citizen may not know which provider serves area
// Admin fills it during approval (Phase 12)
connectionRouter.post(
  '/apply',
  auth,
  [
    body('applicantName')
      .trim()
      .notEmpty().withMessage('Applicant name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

    body('contactMobile')
      .trim()
      .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),

    body('address')
      .trim()
      .notEmpty().withMessage('Address is required')
      .isLength({ min: 10, max: 300 }).withMessage('Address must be 10–300 characters'),

    body('propertyType')
      .notEmpty().withMessage('Property type is required')
      .isIn(PROPERTY_TYPES).withMessage(`Must be one of: ${PROPERTY_TYPES.join(', ')}`),

    // providerName — optional
    // Citizen may know (e.g. "my neighbor has TSSPDCL")
    // Admin confirms/corrects this during review
    body('providerName')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 }).withMessage('Provider name too long'),

    body('sanctionedLoad')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0 }).withMessage('Sanctioned load must be positive')
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        applicantName,
        contactMobile,
        address,
        propertyType,
        providerName,
        sanctionedLoad,
        proofDocUrl
      } = req.body

      // Prevent duplicate pending applications
      const existingPending = await prisma.newConnectionRequest.findFirst({
        where: {
          citizenId:   req.citizen.id,
          serviceType: 'ELECTRICITY',
          status:      { in: ['SUBMITTED', 'UNDER_REVIEW'] }
        }
      })

      if (existingPending) {
        return res.status(409).json({
          error: 'You already have a pending new connection application.',
          code:  'APPLICATION_EXISTS',
          refNo: existingPending.refNo
        })
      }

      const refNo = await generateConnectionRefNo()

      const request = await prisma.newConnectionRequest.create({
        data: {
          citizenId:    req.citizen.id,
          serviceType:  'ELECTRICITY',
          address:      address.trim(),
          propertyType,
          providerName: providerName?.trim() || null,   // ← stored if provided
          docUrl:       proofDocUrl || null,
          status:       'SUBMITTED',
          refNo,
          // Extra details stored as JSON in remarks
          // Phase 12 admin can read these to create ServiceAccount
          remarks: JSON.stringify({
            applicantName:  applicantName.trim(),
            contactMobile,
            sanctionedLoad: sanctionedLoad || null,
            adminNotes:     null
          })
        }
      })

      await prisma.kioskLog.create({
        data: {
          kioskId:     req.kioskId,
          citizenId:   req.citizen.id,
          sessionId:   req.citizen.sessionId,
          action:      'NEW_CONNECTION_APPLIED',
          serviceType: 'ELECTRICITY',
          metadata:    { refNo, propertyType, providerName: providerName || 'unknown' }
        }
      })

      res.status(201).json({
        message:     'New connection application submitted successfully.',
        refNo:       request.refNo,
        status:      'SUBMITTED',
        submittedAt: request.createdAt,
        nextSteps:   'Our team will review your application within 7–14 working days. Please keep your reference number safe.'
      })

    } catch (err) {
      next(err)
    }
  }
)

// ── GET /electricity/connections/track/:refNo ────────────────
connectionRouter.get('/track/:refNo', async (req, res, next) => {
  try {
    const request = await prisma.newConnectionRequest.findFirst({
      where: {
        refNo:       req.params.refNo.toUpperCase(),
        serviceType: 'ELECTRICITY'
      }
    })

    if (!request) {
      return res.status(404).json({
        error: 'Application not found. Please check your reference number.',
        code:  'NOT_FOUND'
      })
    }

    let parsedRemarks = null
    try { parsedRemarks = request.remarks ? JSON.parse(request.remarks) : null } catch { /* ignore */ }

    res.status(200).json({
      refNo:         request.refNo,
      serviceType:   request.serviceType,
      address:       request.address,
      propertyType:  request.propertyType,
      providerName:  request.providerName || 'To be assigned',
      status:        request.status,
      applicantName: parsedRemarks?.applicantName || null,
      adminRemarks:  parsedRemarks?.adminNotes || null,
      submittedAt:   request.createdAt,
      lastUpdated:   request.updatedAt
    })

  } catch (err) {
    next(err)
  }
})

// ── GET /electricity/connections/mine ───────────────────────
connectionRouter.get('/mine', auth, async (req, res, next) => {
  try {
    const requests = await prisma.newConnectionRequest.findMany({
      where:   { citizenId: req.citizen.id, serviceType: 'ELECTRICITY' },
      orderBy: { createdAt: 'desc' },
      select: {
        refNo:        true,
        propertyType: true,
        address:      true,
        providerName: true,
        status:       true,
        createdAt:    true,
        updatedAt:    true
      }
    })

    res.status(200).json({ applications: requests })
  } catch (err) {
    next(err)
  }
})