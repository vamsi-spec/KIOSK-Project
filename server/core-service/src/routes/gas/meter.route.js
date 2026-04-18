import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { auth } from '../../middleware/auth.middleware.js'
import prisma from '../../lib/prisma.js'



export const meterRouter = Router()

const SERVICE_TYPE = 'GAS'
const UNIT_LABEL = 'SCM'


function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: e.path, message: e.msg })) })
  }
  next()
}


meterRouter.post('/submit',auth,[
    body('accountId').notEmpty().isUUID().withMessage('Valid account ID required'),body('readingValue').notEmpty().isFloat({min:0}).withMessage('Reading must be a postive number')
],validate,async (req,res,next) => {
    try {
        const {accountId,readingValue,photoUrl} = req.body

        const account = await prisma.serviceAccount.findFirst({
            where: {id: accountId,citizenId: req.citizen.id,serviceType:SERVICE_TYPE,isActive:true}
        })
        if(!account){
            return res.status(404).json({error: 'Gas account not found.',code:'NOT_FOUND'})
        }
        const existingPending = await prisma.meterReading.findFirst({
            where: { accountId,verificationStatus: 'PENDING'},orderBy: {submittedAt: 'desc'}
        })
        if(existingPending){
            return res.status(409).json({error: 'A reading is already pending verification'})
        }
        const lastVerified = await prisma.meterReading.findFirst({
            where: {accountId,verificationStatus: 'VERIFIED'},orderBy: {submittedAt: 'desc'}
        })
        const previousReading = lastVerified ? Number(lastVerified.readingValue) : 0
        const currentReading = Number(readingValue)

        if(currentReading < previousReading){
            return res.status(422).json({error: 'Reading cannot be less than the previous reading ' + previousReading + UNIT_LABEL,code:'READING_TOO_LOW'})
        }
        if (previousReading > 0 && currentReading > previousReading * 10) {
        return res.status(422).json({ error: 'Reading seems unusually high. Please double-check your meter.', code: 'READING_SUSPICIOUS' })
      }

      const unitsConsumed = Math.round((currentReading - previousReading)*100)/100

      const reading = await prisma.meterReading.create({
        data: {
            accountId,citizenId: req.citizen.id,
            readingValue: currentReading,previousReading,unitsConsumed,photoUrl: photoUrl || null,
            verificationStatus: 'PENDING'
        }
      })

      await prisma.kioskLog.create({
        data: {
          kioskId: req.kioskId, citizenId: req.citizen.id, sessionId: req.citizen.sessionId,
          action: 'METER_READING_SUBMITTED', serviceType: SERVICE_TYPE,
          metadata: { accountId, accountNo: account.accountNo, readingValue: currentReading, previousReadingValue, unitsConsumed, unitLabel: UNIT_LABEL, readingId: reading.id }
        }
      })

      res.status(201).json({
        message: 'Gas meter reading submitted. It will be verified by our team.',
        readingId: reading.id, readingValue: currentReading,
        previousReading, unitsConsumed, unitLabel: UNIT_LABEL,
        verificationStatus: 'PENDING', submittedAt: reading.submittedAt
      })
    } catch (err) { next(err) }
  }
)


meterRouter.get('/history/:accountId',auth,[param('accountId').isUUID().withMessage('Invalid account ID')],
validate,async (req,res,next) => {
    try {
        const {accountId} = req.params
        const account = await prisma.serviceAccount.findFirst({
            where: {id: accountId,citizenId:req.citizen.id,serviceType:SERVICE_TYPE}
        })
        if(!account) return res.status(404).json({error:'Gas account not found.',code: 'NOT_FOUND'})

        const readings = await prisma.meterReading.findMany({
        where: { accountId, verificationStatus: 'VERIFIED' },
        orderBy: { submittedAt: 'desc' },
        take: BILLING.METER_HISTORY_COUNT,
        select: { id: true, readingValue: true, previousReadingValue: true, unitsConsumed: true, submittedAt: true, verifiedAt: true }
      })

      const pendingReading = await prisma.meterReading.findFirst({
        where: { accountId, verificationStatus: 'PENDING' },
        orderBy: { submittedAt: 'desc' },
        select: { id: true, readingValue: true, submittedAt: true }
      })

      res.status(200).json({
        accountNo: account.accountNo,
        unitLabel: UNIT_LABEL,
        pendingReading: pendingReading ? { ...pendingReading, readingValue: Number(pendingReading.readingValue) } : null,
        readings: readings.map(r => ({ ...r, readingValue: Number(r.readingValue), previousReadingValue: Number(r.previousReadingValue), unitsConsumed: Number(r.unitsConsumed) }))
      })
    } catch (err) { next(err) }
  }
)