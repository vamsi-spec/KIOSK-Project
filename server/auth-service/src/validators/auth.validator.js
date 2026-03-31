import {body, query, validationResult} from 'express-validator'

export const validate = (req,res,next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(422).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({field:e.path,message:e.msg}))
        })
    }
    next()
}

export const checkMobileRules = [
  query('mobile')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number')
]


export const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name must contain only letters and spaces'),

  body('mobile')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number'),

  body('aadhaar')
    .trim()
    .notEmpty().withMessage('Aadhaar number is required')
    .matches(/^\d{12}$/).withMessage('Aadhaar must be exactly 12 digits'),

  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const dob  = new Date(value)
      const now  = new Date()
      const age  = now.getFullYear() - dob.getFullYear()
      if (age < 18) throw new Error('You must be at least 18 years old')
      if (age > 120) throw new Error('Invalid date of birth')
      return true
    }),

  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 10, max: 300 }).withMessage('Address must be 10–300 characters'),

  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .withMessage('Invalid gender value'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('preferredLang')
    .optional()
    .isIn(['en', 'hi', 'te']).withMessage('Language must be en, hi, or te')
]

export const sendOtpRules = [
    body('mobile').trim().notEmpty().withMessage('Mobile number is required').matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number')
]


export const verifyOtpRules = [
  body('mobile')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number'),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .matches(/^\d{6}$/).withMessage('OTP must be exactly 6 digits')
]
