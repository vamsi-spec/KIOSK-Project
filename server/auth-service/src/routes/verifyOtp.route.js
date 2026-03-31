import {Router} from 'express'
import prisma from '../lib/prisma.js'
import { verifyOtp } from '../services/otp.service.js'
import { signToken } from '../lib/jwt.js'
import { verifyOtpRules,validate } from '../validators/auth.validator.js'


export const verifyOtpRouter = Router()

verifyOtpRouter.post('/',verifyOtpRules,validate,async (req,res,next) => {
    try {
        const {mobile , otp} = req.body;
        const citizen = await prisma.citizen.findUnique({
            where:{mobile},
            select:{id:true,name:true,mobile:        true,
        preferredLang: true,
        isVerified:    true}
        })

        if(!citizen){
            return res.status(404).json({
                error:'Mobile number not registered. Please register first.',
                code:'NOT_REGISTERED'
            })
        }

        const isOtpValid = await verifyOtp(mobile,otp)

        if(!isOtpValid){
            return res.status(400).json({
                error:'Invalid or expired OTP',
                code:'INVALID_OTP'
            })
        }

        if(!citizen.isVerified){
            await prisma.citizen.update({
                where:{id:citizen.id},
                data:{isVerified:true}
            })
        }

        // Get kiosk ID from header (sent by React kiosk app on every request)
        const kioskId = req.headers['x-kiosk-id'] || 'KIOSK_UNKNOWN'

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

        const tokenPayload = {
      sub:           citizen.id,
      name:          citizen.name,
      mobile:        citizen.mobile,
      preferredLang: citizen.preferredLang,
      kioskId
    }

        const token = signToken(tokenPayload)

        await prisma.session.create({
      data: {
        citizenId: citizen.id,
        token,
        expiresAt,
        kioskId
      }
    })

    await prisma.kioskLog.create({
      data: {
        kioskId,
        citizenId:   citizen.id,
        action:      'LOGIN_SUCCESS',
        metadata:    { method: 'OTP' }
      }
    })

       res.status(200).json({
      token,
      expiresIn: 1800,  // 30 minutes in seconds
      citizen: {
        id:            citizen.id,
        name:          citizen.name,
        preferredLang: citizen.preferredLang
      }
    })

    } catch (error) {
        next(error);
    }
})