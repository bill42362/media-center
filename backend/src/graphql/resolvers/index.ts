// Combined Resolvers
import { authResolvers } from './auth'
import { DateTimeScalar, BigIntScalar } from '../scalars'

export const resolvers = {
  // Custom Scalars
  DateTime: DateTimeScalar,
  BigInt: BigIntScalar,

  // Queries
  Query: {
    ...authResolvers.Query,
    // TODO: Add media, tag, favorites queries
  },

  // Mutations
  Mutation: {
    ...authResolvers.Mutation,
    // TODO: Add media, tag, favorites mutations
  },

  // Type Resolvers
  // TODO: Add Media, Tag, User type resolvers for computed fields
}
