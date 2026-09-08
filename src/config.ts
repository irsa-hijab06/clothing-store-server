import 'dotenv/config'

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`)
}

export const config = {
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI!,
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  cronSecret: process.env.CRON_SECRET,
}
