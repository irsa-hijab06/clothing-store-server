import { Router } from 'express'
import { config } from '../config.js'

const router = Router()
router.get('/ping', async (req, res) => {
  if (config.cronSecret && req.header('x-cron-secret') !== config.cronSecret) return res.status(401).json({ success: false, message: 'Invalid cron secret' })
  res.json({ success: true, message: 'Backend is healthy', data: { timestamp: new Date().toISOString() } })
})
export default router
