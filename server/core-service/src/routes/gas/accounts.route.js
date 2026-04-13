import { enrichBill } from "../../helpers/lateFee"
import { generateVerificationRefNo } from "../../helpers/refNo"
import prisma from "../../lib/prisma"
import redis from "../../lib/redis"
import { auth } from "../../middleware/auth.middleware"





export const accountRouter = Router()

export const GAS_PROVIDERS = [
  'Bhagyanagar Gas Limited (BGL)',
  'GAIL Gas',
  'Adani Total Gas',
  'Indraprastha Gas (IGL)',
  'Mahanagar Gas (MGL)',
  'Gujarat Gas',
  'Torrent Gas',
  'Other'
]


const SERVICE_TYPE = 'GAS'

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

const linkOtpKey      = (m) => `gas_link_otp:${m}`
const linkCooldownKey = (m) => `gas_link_cooldown:${m}`
const linkContextKey  = (m) => `gas_link_ctx:${m}`


accountRouter.get('/mine',auth,async (req,res,next) => {
    try {
        const accounts = await prisma.serviceAccount.findMany({
            where: {citizendId: req.citizen.id,serviceType:SERVICE_TYPE,isActive: true},
            include: {
                bills: {
                    orderBy: {generatedAt: 'desc'},
                    take: 3,
                    include: {
                        transactions: {
                            where: {status: 'SUCCESS'},
                            orderBy: {createdAt: 'desc'},
                            take: 1,
                            select: {amount: true,createdAt: true}
                        }
                    }
                }
            },
            orderBy: {createdAt: 'asc'}
        }) 

        const enrichedAccounts = await Promise.all(
            accounts.map(async (acc) => {
                const allBills = acc.bills
                const pendingBill = allBills.find(b =>
          ['PENDING', 'OVERDUE', 'PAYMENT_IN_PROGRESS', 'PARTIALLY_PAID'].includes(b.status)
        )
                const enriched = pendingBill ? await enrichBill(pendingBill,acc.providerName) : null
                const paidBills = allBills.filter(b=>b.status === 'PAID')
                return {
                    id: acc.id,
                    accountNo: acc.accountNo,
                    providerName: acc.providerName,
                    address: acc.address,
                    billSummary: {
                        hasBills: allBills.length > 0,
                        hasPendingBills: !!pendingBill,
                        pendingBill: enriched,
                        lastPaidDate: paidBills[0]?.transactions[0]?.createdAt || null,
                        totalBillCount: allBills.length
                    }
                }
            })
        )
        return res.status(200).json({accounts:enrichedAccounts})
    } catch (error) {
        next(error)
    }
})


accountRouter.get('/providers', (req, res) => {
  res.status(200).json({ providers: GAS_PROVIDERS })
})


accountRouter.post('/verify-ownership',auth,[body('consumerNo').trim().notEmpty().withMessage('Consumer number is required')],validate,async (req,res,next) => {
    try {
        const {consumerNo} = req.body
        const serviceAccount = await prisma.serviceAccount.findFirst({
            where: {accountNo: consumerNo.trim(),serviceType: SERVICE_TYPE,isActive: true}
        })
        if(!serviceAccount){
            const existingRequest = await prisma.accountVerificationRequest.findFirst({
                where: {consumerNo: consumerNo.trim(),serviceType: SERVICE_TYPE,citizendId: req.citizen.id},orderBy: {createdAt: 'desc'}
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
        return res.status(200).json({
          found: false,
          verificationRequest: { exists: false },
          availableProviders: GAS_PROVIDERS,
          message: 'Consumer number not in system. Please submit your account details for verification.'
        })
      }

      if(serviceAccount.citizendId === req.citizen.id){
        return res.status(409).json({error: 'This account is already linked.',code: 'ALREADY_LINKED'})
      }

      if (req.citizen.mobile === serviceAccount.registeredMobile) {
        await prisma.serviceAccount.update({
          where: { id: serviceAccount.id },
          data:  { citizenId: req.citizen.id }
        })
        await prisma.kioskLog.create({
          data: {
            kioskId: req.kioskId, citizenId: req.citizen.id, sessionId: req.citizen.sessionId,
            action: 'ACCOUNT_LINKED_DIRECT', serviceType: SERVICE_TYPE,
            metadata: { accountNo: consumerNo, method: 'mobile_match' }
          }
        })
        return res.status(200).json({
          found: true, linked: true, requiresOtp: false,
          message: 'Account linked successfully.',
          account: { id: serviceAccount.id, accountNo: serviceAccount.accountNo, providerName: serviceAccount.providerName, address: serviceAccount.address }
        })
      }

      const registeredMobile = serviceAccount.registeredMobile
      const cooldown = await redis.get(linkCooldownKey(registeredMobile))
      if (cooldown) {
        const ttl = await redis.ttl(linkCooldownKey(registeredMobile))
        return res.status(429).json({ error: `OTP already sent. Wait ${ttl} seconds.`, code: 'OTP_COOLDOWN' })
      }

      const otp  = crypto.randomInt(100000, 999999).toString()
      const hash = await bcryptHash(otp)

      await Promise.all([
        redis.setex(linkOtpKey(registeredMobile),      BILLING.LINK_OTP_TTL_SECONDS,      hash),
        redis.setex(linkCooldownKey(registeredMobile),  BILLING.LINK_OTP_COOLDOWN_SECONDS, '1'),
        redis.setex(linkContextKey(registeredMobile),   BILLING.LINK_OTP_TTL_SECONDS,
          JSON.stringify({ citizenId: req.citizen.id, accountId: serviceAccount.id, consumerNo: serviceAccount.accountNo })
        )
      ])

      if (process.env.NODE_ENV !== 'production') {
        console.log('━'.repeat(55))
        console.log(`[GAS LINK OTP DEV] To: ${registeredMobile}  OTP: ${otp}`)
        console.log('━'.repeat(55))
      }

      return res.status(200).json({
        found: true, linked: false, requiresOtp: true,
        maskedMobile: `XXXXXX${registeredMobile.slice(-4)}`,
        expiresIn: BILLING.LINK_OTP_TTL_SECONDS,
        message: 'OTP sent to the mobile registered with this gas account.'
      })
    } catch (err) { next(err) }
  }
)

accountRouter.post('/confirm-link',auth,[
    body('consumerNo').trim().notEmpty().withMessage('Consumer number required'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be 6 digits')
  ],validate,async (req,res,next) => {
    try {
        const {consumerNo,otp} = req.body
        const serviceAccount = await prisma.serviceAccount.findFirst({
            where: {accountNo: consumerNo.trim(),serviceType:SERVICE_TYPE,isActive:true}
        })
        if(!serviceAccount){
            return res.status(404).json({error: "Account not found",code:"NOT_FOUND"})
        }

        const registeredMobile = serviceAccount.registeredMobile
        const contextRaw = await redis.get(linkContextKey(registeredMobile))
        if(!contextRaw){
            return res.status(400).json({error: "OTP EXPIRED,resend the otp",code: "OTP_EXPIRED"})
        }

        const context = JSON.parse(contextRaw)
        if (context.citizenId !== req.citizen.id) return res.status(403).json({ error: 'Unauthorized.', code: 'UNAUTHORIZED' })

        const storedHash = await redis.get(linkOtpKey(registeredMobile))
        if(!storedHash){
            return res.status(400).json({error: "OTP EXPIRED,resend the otp",code: "OTP_EXPIRED"})
        }

        const isValid = await bcryptCompare(otp,storedHash)
        if(!isValid){
            return res.status(401).json({error: "Incorrect otp.Try again",code: "INVALID_OTP"})
        }

        await prisma.serviceAccount.update({ where: { id: context.accountId }, data: { citizenId: req.citizen.id } })
        await Promise.all([redis.del(linkOtpKey(registeredMobile)), redis.del(linkContextKey(registeredMobile))])

        await prisma.kioskLog.create({
        data: {
          kioskId: req.kioskId, citizenId: req.citizen.id, sessionId: req.citizen.sessionId,
          action: 'ACCOUNT_LINKED_OTP', serviceType: SERVICE_TYPE,
          metadata: { accountNo: consumerNo, method: 'otp_verified' }
        }
      })

      res.status(200).json({
        linked: true, message: 'Gas account linked successfully.',
        account: { id: serviceAccount.id, accountNo: serviceAccount.accountNo, providerName: serviceAccount.providerName, address: serviceAccount.address }
      })
    } catch (err) { next(err) }
  }
)



accountRouter.post('/request-verification',auth,[
    body('consumerNo').trim().notEmpty().withMessage('Consumer number required'),
    body('accountHolderName').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Name required'),
    body('registeredMobile').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile required'),
    body('address').trim().notEmpty().isLength({ min: 10, max: 300 }).withMessage('Address required'),
    body('providerName').trim().notEmpty().withMessage('Please select your gas provider')
],validate,async (req,res,next) => {
    try {
        const {consumerNo,accountHolderName,registeredMobile,address,providerName} = req.body
        const existingRequest = await prisma.accountVerificationRequest.findFirst({
            where: {consumerNo:consumerNo.trim(),serviceType: SERVICE_TYPE,citizenId: req.citizen.id,status:"PENDING"}
        })
        if(existingRequest){
            return res.status(409).json({error:"Pending request already exists",code:"REQUEST_EXISTS",refNo:existingRequest.refNo})
        }
        const refNo = await generateVerificationRefNo()
        const request = await prisma.accountVerificationRequest.create({
        data: {
          citizenId: req.citizen.id, serviceType: SERVICE_TYPE,
          consumerNo: consumerNo.trim(), accountHolderName: accountHolderName.trim(),
          registeredMobile, address: address.trim(),
          providerName: providerName.trim(),
          proofDocUrl: proofDocUrl || null,
          status: 'PENDING', refNo
        }
      })
      await prisma.kioskLog.create({
        data: {
          kioskId: req.kioskId, citizenId: req.citizen.id, sessionId: req.citizen.sessionId,
          action: 'ACCOUNT_VERIFICATION_REQUESTED', serviceType: SERVICE_TYPE,
          metadata: { consumerNo, refNo, providerName }
        }
      })

      res.status(201).json({
        message: 'Verification request submitted. Our team will verify within 1–2 working days.',
        refNo: request.refNo, status: 'PENDING', submittedAt: request.createdAt
      })
    } catch (err) { next(err) }
  }
)



accountRouter.get('/verification-status/:refNo',auth,async (req,res,next) => {
    try {
        const acc = await prisma.accountVerificationRequest.findFirst({
            where: {refNo: req.params.refNo.toUpperCase(),citizenId:req.citizen.id}
        })

        if(!acc){
            return res.status(404).json({ error: 'Request not found.', code: 'NOT_FOUND' })
        }

        let linkable = false
        if(acc.status === 'APPROVED'){
            const account = await prisma.serviceAccount.findFirst({
                where: {accountNo: acc.consumerNo,serviceType:SERVICE_TYPE,isActive:true}
            })
            linkable = !!account
        }

        res.status(200).json({
      refNo: request.refNo, consumerNo: request.consumerNo,
      accountHolderName: request.accountHolderName, providerName: request.providerName,
      address: request.address, status: request.status,
      remarks: request.remarks || null, submittedAt: request.createdAt,
      reviewedAt: request.reviewedAt || null, linkable
    })
  } catch (err) { next(err) }
})