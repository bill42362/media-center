// User Service
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'
import { User, UserRole } from '@prisma/client'

/**
 * Check if email is allowed to access the system
 */
export function isEmailAllowed(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim()
  const allowedEmails = [
    env.ADMIN_EMAIL.toLowerCase(),
    ...env.ALLOWED_EMAILS.map(e => e.toLowerCase()),
  ]
  return allowedEmails.includes(normalizedEmail)
}

/**
 * Determine user role based on email
 */
export function getUserRole(email: string): UserRole {
  const normalizedEmail = email.toLowerCase().trim()
  return normalizedEmail === env.ADMIN_EMAIL.toLowerCase()
    ? UserRole.ADMIN
    : UserRole.USER
}

/**
 * Find or create user by email
 */
export async function findOrCreateUser(email: string): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim()

  // Check if email is allowed
  if (!isEmailAllowed(normalizedEmail)) {
    throw new Error('Email not allowed')
  }

  // Find existing user
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  // Create user if not exists
  if (!user) {
    const role = getUserRole(normalizedEmail)
    const displayName = normalizedEmail.split('@')[0]

    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        displayName,
        role,
        safeModeOnly: role === UserRole.USER, // Admin can toggle, User is always safe mode
      },
    })

    logger.info(`New user created: ${normalizedEmail} (${role})`)
  }

  return user
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: userId },
  })
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })
}

/**
 * Update user display name
 */
export async function updateUserDisplayName(userId: string, displayName: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { displayName },
  })
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User): boolean {
  return user.role === UserRole.ADMIN
}

/**
 * Check if user is in safe mode
 * - Regular users are always in safe mode
 * - Admins can toggle safe mode
 */
export function isInSafeMode(user: User): boolean {
  return user.safeModeOnly
}
