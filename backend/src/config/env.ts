// Environment configuration validation
import dotenv from 'dotenv'

dotenv.config()

interface EnvConfig {
  // Server
  NODE_ENV: string
  PORT: number
  FRONTEND_URL: string

  // Database
  DATABASE_URL: string

  // Redis
  REDIS_URL: string

  // JWT
  JWT_SECRET: string
  JWT_EXPIRES_IN: string

  // Admin and users
  ADMIN_EMAIL: string
  ALLOWED_EMAILS: string[]
  USER_FAVORITES_LIMIT: number

  // Email (SMTP)
  SMTP_HOST: string
  SMTP_PORT: number
  SMTP_USER: string
  SMTP_PASS: string
  SMTP_FROM: string

  // OTP
  OTP_EXPIRES_IN: string
  OTP_LENGTH: number

  // Media paths
  VIDEO_SOURCES: string[]
  IMAGE_SOURCES: string[]
  ARTICLE_SOURCES: string[]
  TRANSCODED_PATH: string
  CACHE_PATH: string

  // HLS
  HLS_SEGMENT_DURATION: number
  HLS_PLAYLIST_TYPE: string
  AES_KEY_ROTATION_INTERVAL: number

  // FFmpeg
  FFMPEG_THREADS: number
  FFMPEG_PRESET: string
  FFMPEG_GOP_SIZE: number

  // ABR
  ABR_1080P_BITRATE: string
  ABR_1080P_MAXRATE: string
  ABR_1080P_BUFSIZE: string
  ABR_720P_BITRATE: string
  ABR_720P_MAXRATE: string
  ABR_720P_BUFSIZE: string

  // Transcoding
  FAVORITE_AUTO_TRANSCODE: boolean
  CACHE_MAX_VIDEOS: number
  CACHE_CLEANUP_INTERVAL: number
  MAX_CONCURRENT_TRANSCODE: number

  // Development
  GRAPHQL_PLAYGROUND: boolean
  DEBUG: boolean
  CORS_ORIGINS: string[]
}

function parseEnv(): EnvConfig {
  const required = (key: string): string => {
    const value = process.env[key]
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return value
  }

  const optional = (key: string, defaultValue: string): string => {
    return process.env[key] || defaultValue
  }

  const parseNumber = (key: string, defaultValue: number): number => {
    const value = process.env[key]
    return value ? parseInt(value, 10) : defaultValue
  }

  const parseBoolean = (key: string, defaultValue: boolean): boolean => {
    const value = process.env[key]
    if (value === undefined) return defaultValue
    return value === 'true' || value === '1'
  }

  const parseArray = (key: string, defaultValue: string[] = []): string[] => {
    const value = process.env[key]
    if (!value) return defaultValue
    return value.split(',').map(v => v.trim()).filter(Boolean)
  }

  return {
    // Server
    NODE_ENV: optional('NODE_ENV', 'production'),
    PORT: parseNumber('PORT', 3000),
    FRONTEND_URL: required('FRONTEND_URL'),

    // Database
    DATABASE_URL: required('DATABASE_URL'),

    // Redis
    REDIS_URL: required('REDIS_URL'),

    // JWT
    JWT_SECRET: required('JWT_SECRET'),
    JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),

    // Admin and users
    ADMIN_EMAIL: required('ADMIN_EMAIL'),
    ALLOWED_EMAILS: parseArray('ALLOWED_EMAILS'),
    USER_FAVORITES_LIMIT: parseNumber('USER_FAVORITES_LIMIT', 100),

    // Email
    SMTP_HOST: required('SMTP_HOST'),
    SMTP_PORT: parseNumber('SMTP_PORT', 587),
    SMTP_USER: required('SMTP_USER'),
    SMTP_PASS: required('SMTP_PASS'),
    SMTP_FROM: optional('SMTP_FROM', `Media Center <${process.env.SMTP_USER}>`),

    // OTP
    OTP_EXPIRES_IN: optional('OTP_EXPIRES_IN', '10m'),
    OTP_LENGTH: parseNumber('OTP_LENGTH', 6),

    // Media paths
    VIDEO_SOURCES: parseArray('VIDEO_SOURCES', ['/app/nas/volume1/media/videos']),
    IMAGE_SOURCES: parseArray('IMAGE_SOURCES', ['/app/nas/volume1/media/images']),
    ARTICLE_SOURCES: parseArray('ARTICLE_SOURCES', ['/app/nas/volume1/media/articles']),
    TRANSCODED_PATH: optional('TRANSCODED_PATH', '/app/transcoded'),
    CACHE_PATH: optional('CACHE_PATH', '/app/cache'),

    // HLS
    HLS_SEGMENT_DURATION: parseNumber('HLS_SEGMENT_DURATION', 4),
    HLS_PLAYLIST_TYPE: optional('HLS_PLAYLIST_TYPE', 'vod'),
    AES_KEY_ROTATION_INTERVAL: parseNumber('AES_KEY_ROTATION_INTERVAL', 3600),

    // FFmpeg
    FFMPEG_THREADS: parseNumber('FFMPEG_THREADS', 4),
    FFMPEG_PRESET: optional('FFMPEG_PRESET', 'medium'),
    FFMPEG_GOP_SIZE: parseNumber('FFMPEG_GOP_SIZE', 2),

    // ABR
    ABR_1080P_BITRATE: optional('ABR_1080P_BITRATE', '5000k'),
    ABR_1080P_MAXRATE: optional('ABR_1080P_MAXRATE', '5500k'),
    ABR_1080P_BUFSIZE: optional('ABR_1080P_BUFSIZE', '10000k'),
    ABR_720P_BITRATE: optional('ABR_720P_BITRATE', '3000k'),
    ABR_720P_MAXRATE: optional('ABR_720P_MAXRATE', '3300k'),
    ABR_720P_BUFSIZE: optional('ABR_720P_BUFSIZE', '6000k'),

    // Transcoding
    FAVORITE_AUTO_TRANSCODE: parseBoolean('FAVORITE_AUTO_TRANSCODE', true),
    CACHE_MAX_VIDEOS: parseNumber('CACHE_MAX_VIDEOS', 64),
    CACHE_CLEANUP_INTERVAL: parseNumber('CACHE_CLEANUP_INTERVAL', 86400),
    MAX_CONCURRENT_TRANSCODE: parseNumber('MAX_CONCURRENT_TRANSCODE', 2),

    // Development
    GRAPHQL_PLAYGROUND: parseBoolean('GRAPHQL_PLAYGROUND', false),
    DEBUG: parseBoolean('DEBUG', false),
    CORS_ORIGINS: parseArray('CORS_ORIGINS', ['http://localhost:5173']),
  }
}

export const env = parseEnv()
