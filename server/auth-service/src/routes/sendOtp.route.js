import {Router} from 'express'
import prisma from '../lib/prisma.js'
import { sendOtpSms } from '../lib/sms.js'
import { generateAndStoreOtp } from '../services/otp.service.js'
import { sendOtpRules,validate } from '../validators/auth.validator.js'


export const sendOtpRouter = Router()

sendOtpRouter.post('/',sendOtpRules,validate,async (req,res,next) => {
    try {
        const {mobile} = req.body
        const citizen = await prisma.citizen.findUnique({
            where: {mobile},
            select: {id: true,name: true}
        })

        if(!citizen){
            return res.status(404).json({
                error:'Mobile number not registered. Please register first.',
                code:'NOT_REGISTERED'
            })
        }

        const otp = await generateAndStoreOtp(mobile)

        await sendOtpSms(mobile,otp)

        res.status(200).json({
            message: "OTP send successfully.",
            expiresIn: 300
        })
    } catch (error) {
        next(error)
    }
})