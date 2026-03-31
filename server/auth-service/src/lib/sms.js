// SMS service — abstracted so swapping providers (MSG91, Twilio, etc.)
// only requires changes in this file, nowhere else

export async function sendOtpSms(mobile, otp) {
  const message = `Your SUVIDHA OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`

  // In development: log to console instead of sending a real SMS
  // This lets the whole team develop without burning SMS credits
  if (process.env.NODE_ENV !== 'production') {
    console.log('━'.repeat(50))
    console.log(`[SMS — DEV MODE]  To: ${mobile}`)
    console.log(`[SMS — DEV MODE]  Message: ${message}`)
    console.log(`[SMS — DEV MODE]  OTP: ${otp}`)
    console.log('━'.repeat(50))
    return { success: true, dev: true }
  }

  // Production: call your SMS provider here
  // Example with MSG91:
  //
  // const response = await fetch('https://api.msg91.com/api/v5/otp', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', authkey: process.env.SMS_API_KEY },
  //   body: JSON.stringify({
  //     template_id: process.env.SMS_TEMPLATE_ID,
  //     mobile,
  //     otp,
  //     sender: process.env.SMS_SENDER_ID || 'SUVIDHA'
  //   })
  // })
  // const data = await response.json()
  // if (data.type !== 'success') throw new Error(`SMS failed: ${data.message}`)
  // return { success: true }

  throw new Error('SMS provider not configured for production')
}
