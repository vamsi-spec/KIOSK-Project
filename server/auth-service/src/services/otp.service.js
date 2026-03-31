import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import redis from '../lib/redis.js'

const OTP_TTL_SECONDS = 300
const OTP_RESEND_COOLDOWN = 60

const MAX_ATTEMPTS = 5

const LOCK_DURATION = 900

const otpKey = (mobile) => `otp${mobile}`
const attemptsKey = (mobile) => `otp_attempts:${mobile}`
const cooldownKey = (mobile) => `otp_cooldown:${mobile}`
const lockKey     = (mobile) => `otp_lock:${mobile}`


export const generateAndStoreOtp = async (mobile) => {
    const locked = await redis.get(lockKey(mobile))
    if(locked){
        const ttl = await redis.ttl(lockKey(mobile))
        const error = new Error(`Account locked due to too many attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`)
    error.status = 423
    throw error
    }


    const cooldown = await redis.get(cooldownKey(mobile))
  if (cooldown) {
    const ttl = await redis.ttl(cooldownKey(mobile))
    const error = new Error(`Please wait ${ttl} seconds before requesting a new OTP.`)
    error.status = 429
    throw error
  }
  const otp  = crypto.randomInt(100000, 999999).toString()
  const hash = await bcrypt.hash(otp, 10)

  await redis.setex(otpKey(mobile), OTP_TTL_SECONDS, hash)

  await redis.setex(cooldownKey(mobile), OTP_RESEND_COOLDOWN, '1')

  await redis.del(attemptsKey(mobile))

  return otp 
}

export async function verifyOtp(mobile, submittedOtp) {
  // Check account lock first
  const locked = await redis.get(lockKey(mobile))
  if (locked) {
    const ttl = await redis.ttl(lockKey(mobile))
    const error = new Error(`Account locked. Try again in ${Math.ceil(ttl / 60)} minutes.`)
    error.status = 423
    throw error
  }

  const storedHash = await redis.get(otpKey(mobile))
  if (!storedHash) {
    const error = new Error('OTP has expired. Please request a new one.')
    error.status = 401
    throw error
  }

  // Compare submitted OTP against stored bcrypt hash
  const isMatch = await bcrypt.compare(submittedOtp, storedHash)

  if (!isMatch) {
    // Increment failure counter
    const attempts = await redis.incr(attemptsKey(mobile))
    await redis.expire(attemptsKey(mobile), OTP_TTL_SECONDS)

    const remaining = MAX_ATTEMPTS - attempts

    if (remaining <= 0) {
      // Lock the account and clean up OTP
      await redis.setex(lockKey(mobile), LOCK_DURATION, '1')
      await redis.del(otpKey(mobile))
      await redis.del(attemptsKey(mobile))
      const error = new Error('Too many wrong attempts. Account locked for 15 minutes.')
      error.status = 423
      throw error
    }

    const error = new Error(`Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`)
    error.status = 401
    throw error
  }

  // OTP matched — clean up all Redis keys immediately
  await Promise.all([
    redis.del(otpKey(mobile)),
    redis.del(attemptsKey(mobile)),
    redis.del(cooldownKey(mobile)),
    redis.del(lockKey(mobile))
  ])

  return true
}

