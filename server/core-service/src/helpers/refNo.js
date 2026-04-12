import prisma from '../lib/prisma.js'


export const generateComplaintRefNo = async () => {
    const year = new Date().getFullYear()
    const count = await prisma.complaint.count()
    const seq = String(count + 1).padStart(5,'0')
    return `COMP-${year}-${seq}`
}

export async function generateConnectionRefNo() {
  const year  = new Date().getFullYear()
  const count = await prisma.newConnectionRequest.count()
  const seq   = String(count + 1).padStart(5, '0')
  return `CONN-${year}-${seq}`
}

export async function generateVerificationRefNo() {
  const year  = new Date().getFullYear()
  const count = await prisma.accountVerificationRequest.count()
  const seq   = String(count + 1).padStart(5, '0')
  return `AVR-${year}-${seq}`
}
