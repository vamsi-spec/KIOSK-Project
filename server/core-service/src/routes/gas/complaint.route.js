import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { generateComplaintRefNo } from '../../helpers/refNo.js'
import prisma from '../../lib/prisma.js'
import { auth } from '../../middleware/auth.middleware.js'



export const complaintRouter = Router()

const SERVICE_TYPE = 'GAS'
const EMERGENCY_CATEGORY = 'Gas leak'


const GAS_CATEGORIES = [
  'Gas leak',
  'No gas supply',
  'Low gas pressure',
  'Meter fault',
  'Billing error',
  'Regulator issue',
  'Pipeline damage',
  'New appliance connection',
  'Other'
]

const emergencyLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             3,
  keyGenerator:    (req) => req.headers['x-kiosk-id'] || req.ip,
  message:         { error: 'Too many emergency reports. If this is a real emergency, call 040-23234701 immediately.' }
})

function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: e.path, message: e.msg })) })
  }
  next()
}

complaintRouter.get('/categories',(req,res)=>{
    res.status(200).json({categories:GAS_CATEGORIES,emergencyCategory:EMERGENCY_CATEGORY})
})

complaintRouter.post('/emergency',emergencyLimiter,[
    body('address').trim().notEmpty().isLength({ min: 5, max: 300 }).withMessage('Location/address is required'),
    body('mobileForCallback').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid mobile number required'),
    body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 })
  ],validate,async (req,res,next) => {
    try {
        const {address,mobileForCallback,description} = req.body
        const refNo = await generateComplaintRefNo()
        const complaint = await prisma.complaint.create({
            data: {
                citizenId: null,
                serviceType: SERVICE_TYPE,
                category: EMERGENCY_CATEGORY,
                description: description?.trim() || `Emegency gas leak. Address: ${address}.Callback: ${mobileForCallback}`,
                status: 'SUBMITTED',
                refNo
            }
        })

        await prisma.kioskLog.create({
        data: {
          kioskId:     req.headers['x-kiosk-id'] || 'KIOSK_EMERGENCY',
          citizenId:   null,
          action:      'GAS_EMERGENCY_REPORTED',
          serviceType: SERVICE_TYPE,
          metadata:    { refNo, address, mobileForCallback, timestamp: new Date().toISOString() }
        }
      })

      // Prominent log — production should trigger SMS/webhook to BGL emergency team
      console.error('🚨 GAS EMERGENCY COMPLAINT FILED')
      console.error(`   RefNo:    ${refNo}`)
      console.error(`   Address:  ${address}`)
      console.error(`   Callback: ${mobileForCallback}`)
      console.error(`   Time:     ${new Date().toISOString()}`)

      res.status(201).json({
        message:          'Emergency reported. Our team will respond immediately.',
        refNo:            complaint.refNo,
        status:           'SUBMITTED',
        emergencyPhone:   '040-23234701',
        nationalHelpline: '1906',
        instructions: [
          'Turn off the valve near your gas meter immediately',
          'Open all doors and windows',
          'Do NOT switch any electrical appliances on or off',
          'Leave the premises immediately',
          'Do NOT use any open flame or lighter',
          'Do NOT use your mobile phone inside the building'
        ]
      })
    } catch (err) { next(err) }
  }
)



complaintRouter.post('/',auth,[
    body('category').notEmpty().isIn(GAS_CATEGORIES).withMessage('Invalid complaint category'),
    body('description').trim().notEmpty().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10–1000 chars')
  ],validate,async (req,res,next) => {
    try {
        const {category,description,docUrl} = req.body

        if(category === EMERGENCY_CATEGORY) {
        return res.status(400).json({
          error: 'Gas leak is an emergency. Please use the emergency report instead.',
          code:  'USE_EMERGENCY_ROUTE'
        })
      }
      const refNo = await generateComplaintRefNo()

      const complaint = await prisma.complaint.create({
        data: {
            citizenId: req.citizen.id, serviceType: SERVICE_TYPE,
          category, description: description.trim(),
          docUrl: docUrl || null, status: 'SUBMITTED', refNo
        }
      })

      await prisma.kioskLog.create({
        data: {
          kioskId: req.kioskId, citizenId: req.citizen.id, sessionId: req.citizen.sessionId,
          action: 'COMPLAINT_FILED', serviceType: SERVICE_TYPE, metadata: { refNo, category }
        }
      })

      res.status(201).json({ message: 'Complaint filed successfully.', refNo: complaint.refNo, status: complaint.status, category: complaint.category, submittedAt: complaint.createdAt })
    } catch (err) { next(err) }
  }
)

complaintRouter.get('/:refNo',async (req,res,next) => {
    try {
        const complaint = await prisma.complaint.findFirst({
            where: {refNo: req.params.refNo.toUpperCase(),serviceType: SERVICE_TYPE},select: {
                refNo:true,
                category:true,
                description: true,
                status: true,
                assignedTo: true,
                resolutionNote: true,
                createdAt: true,
                resolvedAt: true
            }
        })

        if(!complaint){
            return res.status(404).json({error: 'Complaint not found',code: 'NOT_FOUND'})
        }

        res.status(200).json({...complaint,isEmergency:complaint.category === EMERGENCY_CATEGORY})
    } catch (error) {
        next(error)
    }
})


complaintRouter.get('/mine/all',auth,async (req,res,next) => {
    try {
        const complaints = await prisma.complaint.findMany({
            where: {citizenId: req.citizen.id,serviceType:SERVICE_TYPE},
            orderBy: {createdAt: 'desc'},
            select: {
                refNo:true,
                category:true,
                status: true,
                createdAt: true,
                resolvedAt: true
            }
        })

        res.status(200).json(complaints)
    } catch (error) {
        next(error)
    }
})