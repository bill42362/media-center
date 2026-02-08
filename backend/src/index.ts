// Main entry point
import { createApp } from './server'
import { env } from './config/env'
import { logger } from './utils/logger'
import { prisma } from './config/database'
import { redis } from './config/redis'

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect()
    logger.info('Database connected')

    // Test Redis connection
    await redis.ping()
    logger.info('Redis connected')

    // Create Express app with Apollo Server
    const { app, httpServer } = await createApp()

    // Start server
    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 Server ready at http://localhost:${env.PORT}`)
      logger.info(`🚀 GraphQL endpoint: http://localhost:${env.PORT}/graphql`)
      logger.info(`📝 Environment: ${env.NODE_ENV}`)

      if (env.GRAPHQL_PLAYGROUND) {
        logger.info(`🎮 GraphQL Playground: http://localhost:${env.PORT}/graphql`)
      }
    })

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`)

      httpServer.close(() => {
        logger.info('HTTP server closed')
      })

      await prisma.$disconnect()
      logger.info('Database disconnected')

      await redis.quit()
      logger.info('Redis disconnected')

      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()
