// Express + Apollo Server Setup
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { createServer } from 'http'
import { typeDefs } from './graphql/schema'
import { resolvers } from './graphql/resolvers'
import { createContext } from './graphql/context'
import { env } from './config/env'
import { logger } from './utils/logger'

export async function createApp() {
  const app = express()
  const httpServer = createServer(app)

  // ========================================
  // Middleware
  // ========================================

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    })
  )

  // Body parsers
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Cookie parser
  app.use(cookieParser())

  // ========================================
  // Health Check
  // ========================================

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // ========================================
  // Apollo Server
  // ========================================

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Custom plugin for logging
      {
        async requestDidStart({ request }) {
          logger.debug('GraphQL Request:', {
            query: request.query,
            variables: request.variables,
          })
        },
      },
    ],
    introspection: env.GRAPHQL_PLAYGROUND,
  })

  await server.start()

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: createContext,
    })
  )

  // ========================================
  // Error Handling
  // ========================================

  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Express error:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: env.NODE_ENV === 'development' ? err.message : undefined,
    })
  })

  return { app, httpServer }
}
