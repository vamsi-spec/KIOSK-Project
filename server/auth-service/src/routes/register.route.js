import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { sendOtpSms } from '../lib/sms.js'
import { generateAndStoreOtp } from '../services/otp.service.js'
import { registerRules, validate } from '../validators/auth.validator.js'

export const registerRouter = Router()

registerRouter.post('/', registerRules, validate, async (req, res, next) => {
  try {
    const {
      name,
      mobile,
      aadhaar,
      dateOfBirth,
      address,
      gender,
      email,
      preferredLang = 'en'
    } = req.body

    // Hash Aadhaar before storing — DPDP Act compliance
    const aadhaarHash = crypto
      .createHash('sha256')
      .update(aadhaar.replace(/\s/g, ''))
      .digest('hex')

    // Create citizen — Prisma unique constraint handles race conditions
    let citizen
    try {
      citizen = await prisma.citizen.create({
        data: {
          name:         name.trim(),
          mobile,
          aadhaarHash,
          dateOfBirth:  new Date(dateOfBirth),
          address:      address.trim(),
          gender,
          email:        email || null,
          preferredLang,
          isVerified:   false
        },
        select: {
          id:            true,
          name:          true,
          mobile:        true,
          preferredLang: true
        }
      })
    } catch (prismaErr) {
      
      if (prismaErr.code === 'P2002') {
        return res.status(409).json({
          error: 'Mobile number already registered. Please log in.',
          code:  'ALREADY_REGISTERED'
        })
      }
      throw prismaErr
    }

    // Send OTP immediately after registration
    const otp = await generateAndStoreOtp(mobile)
    await sendOtpSms(mobile, otp)

    res.status(201).json({
      message:   'Registered successfully. OTP sent to your mobile.',
      citizenId: citizen.id,
      expiresIn: 300
    })

  } catch (err) {
    next(err)
  }
})