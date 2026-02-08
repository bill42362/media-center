// OTP Service
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

/**
 * Generate a random OTP code
 */
export function generateOTPCode(length: number = env.OTP_LENGTH): string {
  const digits = '0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }
  return code
}

/**
 * Get OTP expiration time
 */
function getOTPExpiration(): Date {
  const minutes = parseInt(env.OTP_EXPIRES_IN.replace('m', ''), 10) || 10
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes)
  return expiresAt
}

/**
 * Create and store OTP
 */
export async function createOTP(email: string): Promise<{ code: string; expiresAt: Date }> {
  const code = generateOTPCode()
  const expiresAt = getOTPExpiration()

  // Delete old OTPs for this email
  await prisma.oTP.deleteMany({
    where: { email },
  })

  // Create new OTP
  await prisma.oTP.create({
    data: {
      email,
      code,
      expiresAt,
      verified: false,
    },
  })

  logger.info(`OTP created for ${email}`)

  return { code, expiresAt }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const otp = await prisma.oTP.findFirst({
    where: {
      email,
      code,
      verified: false,
      expiresAt: {
        gte: new Date(),
      },
    },
  })

  if (!otp) {
    logger.warn(`Invalid OTP attempt for ${email}`)
    return false
  }

  // Mark as verified
  await prisma.oTP.update({
    where: { id: otp.id },
    data: { verified: true },
  })

  logger.info(`OTP verified for ${email}`)

  return true
}

/**
 * Clean up expired OTPs (should be run periodically)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const result = await prisma.oTP.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  if (result.count > 0) {
    logger.info(`Cleaned up ${result.count} expired OTPs`)
  }

  return result.count
}
