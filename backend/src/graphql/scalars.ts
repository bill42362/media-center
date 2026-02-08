// Custom GraphQL Scalars
import { GraphQLScalarType, Kind } from 'graphql'

/**
 * DateTime scalar
 */
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 DateTime string',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString()
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString()
    }
    throw new Error('DateTime must be a Date object or ISO string')
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      return new Date(value)
    }
    throw new Error('DateTime must be a string')
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value)
    }
    throw new Error('DateTime must be a string')
  },
})

/**
 * BigInt scalar
 */
export const BigIntScalar = new GraphQLScalarType({
  name: 'BigInt',
  description: 'BigInt scalar for large numbers',
  serialize(value: unknown): string {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    if (typeof value === 'number') {
      return BigInt(value).toString()
    }
    if (typeof value === 'string') {
      return value
    }
    throw new Error('BigInt must be a bigint, number, or string')
  },
  parseValue(value: unknown): bigint {
    if (typeof value === 'string') {
      return BigInt(value)
    }
    if (typeof value === 'number') {
      return BigInt(value)
    }
    throw new Error('BigInt must be a string or number')
  },
  parseLiteral(ast): bigint {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      return BigInt(ast.value)
    }
    throw new Error('BigInt must be a string or integer')
  },
})
