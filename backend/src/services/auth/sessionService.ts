// Session Service (JWT + Database)
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'
import { UserRole } from '@prisma/client'

interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  sessionId: string
}

/**
 * Generate JWT token expiration
 */
function getTokenExpiration(): Date {
  const expiresIn = env.JWT_EXPIRES_IN
  const days = parseInt(expiresIn.replace('d', ''), 10) || 7
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)
  return expiresAt
}

/**
 * Create session and JWT token
 */
export async function createSession(userId: string, email: string, role: UserRole): Promise<string> {
  const sessionId = uuidv4()
  const expiresAt = getTokenExpiration()

  // Create JWT payload
  const payload: JWTPayload = {
    userId,
    email,
    role,
    sessionId,
  }

  // Sign JWT
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })

  // Store session in database
  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      token,
      expiresAt,
    },
  })

  logger.info(`Session created for user ${email}`)

  return token
}

/**
 * Verify JWT token and get user
 */
export async function verifySession(token: string): Promise<JWTPayload | null> {
  try {
    // Verify JWT
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload

    // Check if session exists in database and is not expired
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        token,
        expiresAt: {
          gte: new Date(),
        },
      },
    })

    if (!session) {
      logger.warn(`Session not found or expired for token`)
      return null
    }

    return payload
  } catch (error) {
    logger.warn(`Invalid JWT token:`, error)
    return null
  }
}

/**
 * Delete session (logout)
 */
export async function deleteSession(token: string): Promise<boolean> {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload

    await prisma.session.delete({
      where: { id: payload.sessionId },
    })

    logger.info(`Session deleted for user ${payload.email}`)
    return true
  } catch (error) {
    logger.error(`Failed to delete session:`, error)
    return false
  }
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  if (result.count > 0) {
    logger.info(`Cleaned up ${result.count} expired sessions`)
  }

  return result.count
}
