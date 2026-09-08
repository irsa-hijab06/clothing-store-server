import express from 'express'
import cors from 'cors'
import * as helmetModule from 'helmet'
import * as rateLimitModule from 'express-rate-limit'
import { config } from './config.js'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import adminRoutes from './routes/admin.js'
import healthRoutes from './routes/health.js'
import { connectDatabase } from './db.js'

const app = express()
app.use(helmetModule.default())
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10kb' }))
app.use(rateLimitModule.default({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }))

app.get('/api', (_req, res) => res.json({ success: true, message: 'Clothing Store API', data: { version: '1.0.0' } }))
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/cron', healthRoutes)

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }))
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error)
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    return res.status(409).json({ success: false, message: 'A record with one of these values already exists' })
  }
  if (error instanceof Error && error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: error.message })
  }
  res.status(500).json({ success: false, message: 'Internal server error' })
})

connectDatabase().then(() => {
  app.listen(config.port, () => console.log(`Clothing Store API listening on http://localhost:${config.port}`))
}).catch((error) => {
  console.error('MongoDB connection failed', error)
  process.exit(1)
})
