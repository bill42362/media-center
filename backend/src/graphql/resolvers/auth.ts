// Auth Resolvers
import { GraphQLError } from 'graphql'
import { GraphQLContext } from '../context'
import { createOTP, verifyOTP } from '../../services/auth/otpService'
import { sendOTPEmail } from '../../services/auth/emailService'
import { findOrCreateUser, isEmailAllowed } from '../../services/auth/userService'
import { createSession, deleteSession } from '../../services/auth/sessionService'
import { logger } from '../../utils/logger'

export const authResolvers = {
  Query: {
    /**
     * Get current logged-in user
     */
    me: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.isAuthenticated || !context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      return context.user
    },
  },

  Mutation: {
    /**
     * Request OTP - Send OTP to email
     */
    requestOTP: async (_: unknown, { email }: { email: string }) => {
      const normalizedEmail = email.toLowerCase().trim()

      // Check if email is allowed
      if (!isEmailAllowed(normalizedEmail)) {
        throw new GraphQLError('Email not allowed. Please contact admin.', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      try {
        // Create OTP
        const { code, expiresAt } = await createOTP(normalizedEmail)

        // Send email
        await sendOTPEmail(normalizedEmail, code, expiresAt)

        logger.info(`OTP requested for ${normalizedEmail}`)

        return {
          email: normalizedEmail,
          expiresAt,
          message: `OTP sent to ${normalizedEmail}`,
        }
      } catch (error) {
        logger.error('Failed to request OTP:', error)
        throw new GraphQLError('Failed to send OTP. Please try again later.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }
    },

    /**
     * Verify OTP - Verify OTP and login
     */
    verifyOTP: async (
      _: unknown,
      { email, code }: { email: string; code: string },
      context: GraphQLContext
    ) => {
      const normalizedEmail = email.toLowerCase().trim()

      try {
        // Verify OTP
        const isValid = await verifyOTP(normalizedEmail, code)

        if (!isValid) {
          throw new GraphQLError('Invalid or expired OTP', {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }

        // Find or create user
        const user = await findOrCreateUser(normalizedEmail)

        // Create session
        const token = await createSession(user.id, user.email, user.role)

        // Set cookie
        context.res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })

        logger.info(`User logged in: ${user.email}`)

        return {
          token,
          user,
        }
      } catch (error) {
        logger.error('Failed to verify OTP:', error)

        if (error instanceof GraphQLError) {
          throw error
        }

        throw new GraphQLError('Failed to verify OTP', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }
    },

    /**
     * Logout - Delete session
     */
    logout: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.isAuthenticated) {
        return true
      }

      try {
        const token = context.req.cookies?.token || context.req.headers.authorization?.replace('Bearer ', '')

        if (token) {
          await deleteSession(token)
        }

        // Clear cookie
        context.res.clearCookie('token')

        logger.info(`User logged out: ${context.user?.email}`)

        return true
      } catch (error) {
        logger.error('Failed to logout:', error)
        return false
      }
    },
  },
}
