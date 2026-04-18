import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { auth } from '../../middleware/auth.middleware.js'
import prisma from '../../lib/prisma.js'
import { generateConnectionRefNo } from '../../helpers/refNo.js'


export const connectionRouter = Router()

const SERVICE_TYPE   = 'GAS'
const PROPERTY_TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL']
const CONNECTION_TYPES = ['PNG', 'LPG']


function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: e.path, message: e.msg })) })
  }
  next()
}


connectionRouter.post('/apply',auth,[
    body('applicantName').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Applicant name required'),
    body('contactMobile').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile required'),
    body('address').trim().notEmpty().isLength({ min: 10, max: 300 }).withMessage('Address required'),
    body('propertyType').notEmpty().isIn(PROPERTY_TYPES).withMessage('Invalid property type'),
    body('connectionType').notEmpty().isIn(CONNECTION_TYPES).withMessage('Connection type must be PNG or LPG'),
    body('providerName').optional({ checkFalsy: true }).trim().isLength({ max: 100 })
  ],validate,async (req,res,next) => {
    try {
        const { applicantName, contactMobile, address, propertyType, connectionType, providerName, proofDocUrl } = req.body

        const existingPending = await prisma.newConnectionRequest.findFirst({
            where: {citizenId: req.citizen.id,serviceType: SERVICE_TYPE,status: {in: ['SUBMITTED','UNDER_REVIEW']}}
        })
        if(existingPending){
            return res.status(409).json({error: 'You already have a pending gas connection application.',code:'APPLICATION_EXISTS',refNo:existingPending.refNo})
        }
        const refNo = await generateConnectionRefNo()
        const request = await prisma.newConnectionRequest.create({
            data: {
                citizenId: req.citizen.id,serviceType: SERVICE_TYPE,
                address: address.trim(),propertyType,providerName: providerName?.trim() || null,
                docUrl: proofDocUrl || null,
                status: 'SUBMITTED',refNo,
                remarks: JSON.stringify({applicantName: applicantName.trim(),contactMobile,connectionType,adminNotes: null})
            }
        })

        await prisma.kioskLog.create({
            data: {
          kioskId: req.kioskId, citizenId: req.citizen.id, sessionId: req.citizen.sessionId,
          action: 'NEW_CONNECTION_APPLIED', serviceType: SERVICE_TYPE,
          metadata: { refNo, propertyType, connectionType, providerName: providerName || 'unknown' }
        }
        })
res.status(201).json({
        message: 'Gas connection application submitted.',
        refNo: request.refNo, status: 'SUBMITTED', connectionType,
        submittedAt: request.createdAt,
        nextSteps: connectionType === 'PNG'
          ? 'A surveyor will visit your premises within 7–14 working days to assess pipeline feasibility.'
          : 'Your LPG connection will be processed within 3–5 working days.'
      })
    } catch (err) { next(err) }
  }
)



connectionRouter.get('/track/:refNo',async (req,res,next) => {
    try {
        const {refNo} = req.params
        const request = await prisma.newConnectionRequest.findFirst({
            where: {refNo: refNo.toUpperCase(),serviceType: SERVICE_TYPE}
        })
        if(!request){
            return res.status(404).json({error: 'Application not found',code: 'NOT_FOUND'})
        }
        let parsedRemarks = null
        try { parsedRemarks = request.remarks ? JSON.parse(request.remarks) : null } catch { /* ok */ }

      res.status(200).json({
      refNo: request.refNo, serviceType: request.serviceType, address: request.address,
      propertyType: request.propertyType, providerName: request.providerName || 'To be assigned',
      connectionType: parsedRemarks?.connectionType || 'PNG',
      status: request.status, applicantName: parsedRemarks?.applicantName || null,
      adminRemarks: parsedRemarks?.adminNotes || null,
      submittedAt: request.createdAt, lastUpdated: request.updatedAt
    })
  } catch (err) { next(err) }
})

connectionRouter.get('/mine', auth, async (req, res, next) => {
  try {
    const requests = await prisma.newConnectionRequest.findMany({
      where: { citizenId: req.citizen.id, serviceType: SERVICE_TYPE },
      orderBy: { createdAt: 'desc' },
      select: { refNo: true, propertyType: true, address: true, providerName: true, status: true, createdAt: true }
    })
    res.status(200).json({ applications: requests })
  } catch (err) { next(err) }
})