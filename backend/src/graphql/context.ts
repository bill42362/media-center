// GraphQL Context
import { Request, Response } from 'express'
import { User, UserRole } from '@prisma/client'
import { verifySession } from '../services/auth/sessionService'
import { getUserById, isAdmin, isInSafeMode } from '../services/auth/userService'
import { logger } from '../utils/logger'

export interface GraphQLContext {
  req: Request
  res: Response
  user?: User
  isAuthenticated: boolean
  isAdmin: boolean
  isSafeMode: boolean
}

/**
 * Create GraphQL context from request
 */
export async function createContext({ req, res }: { req: Request; res: Response }): Promise<GraphQLContext> {
  // Extract token from cookie or Authorization header
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')

  let user: User | undefined
  let isAuthenticated = false
  let isAdminUser = false
  let isSafeMode = true

  if (token) {
    try {
      // Verify session
      const session = await verifySession(token)

      if (session) {
        // Get full user data
        const userData = await getUserById(session.userId)

        if (userData) {
          user = userData
          isAuthenticated = true
          isAdminUser = isAdmin(userData)
          isSafeMode = isInSafeMode(userData)
        }
      }
    } catch (error) {
      logger.warn('Failed to verify session in context', error)
    }
  }

  return {
    req,
    res,
    user,
    isAuthenticated,
    isAdmin: isAdminUser,
    isSafeMode,
  }
}
