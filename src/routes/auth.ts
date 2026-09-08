import { Router } from 'express'
import { body } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { Profile } from '../models.js'
import { asyncRoute, protect, validate } from '../middleware.js'
import type { AuthRequest } from '../types.js'

const router = Router()
function issueTokens(user: { id: string; email: string; role: 'user' | 'admin' }) {
  const payload = { id: user.id, email: user.email, role: user.role }
  const accessToken = jwt.sign(payload, config.accessSecret, { expiresIn: config.accessExpiresIn as jwt.SignOptions['expiresIn'] })
  const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, config.refreshSecret, { expiresIn: config.refreshExpiresIn as jwt.SignOptions['expiresIn'] })
  return { access_token: accessToken, refresh_token: refreshToken, expires_in: config.accessExpiresIn }
}

router.post('/register', [body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })], validate, asyncRoute(async (req, res) => {
  const email = req.body.email.toLowerCase()
  if (await Profile.exists({ email })) return res.status(409).json({ success: false, message: 'Email already registered' })
  const passwordHash = await bcrypt.hash(req.body.password, 12)
  const profile = await Profile.create({ name: req.body.name, email, passwordHash })
  const session = issueTokens({ id: profile.id, email, role: profile.role })
  res.status(201).json({ success: true, message: 'User registered successfully', data: { session, user: { id: profile.id, email }, profile: profile.toJSON() } })
}))

router.post('/login', [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], validate, asyncRoute(async (req, res) => {
  const profile = await Profile.findOne({ email: req.body.email.toLowerCase() })
  if (!profile || !(await bcrypt.compare(req.body.password, profile.passwordHash))) return res.status(401).json({ success: false, message: 'Invalid credentials' })
  const session = issueTokens({ id: profile.id, email: profile.email, role: profile.role })
  res.json({ success: true, message: 'Login successful', data: { session, user: { id: profile.id, email: profile.email }, profile: profile.toJSON() } })
}))

router.post('/logout', protect, asyncRoute(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully', data: null })
}))

router.post('/refresh-token', [body('refreshToken').notEmpty()], validate, asyncRoute(async (req, res) => {
  let payload: { id: string; type?: string }
  try { payload = jwt.verify(req.body.refreshToken, config.refreshSecret) as { id: string; type?: string } } catch { return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' }) }
  if (payload.type !== 'refresh') return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' })
  const profile = await Profile.findById(payload.id)
  if (!profile) return res.status(401).json({ success: false, message: 'User not found' })
  res.json({ success: true, message: 'Token refreshed', data: { session: issueTokens({ id: profile.id, email: profile.email, role: profile.role }) } })
}))

router.get('/me', protect, asyncRoute(async (req, res) => {
  const request = req as AuthRequest
  const profile = await Profile.findById(request.user!.id).select('-passwordHash')
  res.json({ success: true, message: 'Current user', data: { user: { id: request.user!.id, email: request.user!.email }, profile } })
}))

router.put('/update-profile', protect, [body('name').optional().trim().notEmpty(), body('phone').optional().isString(), body('address').optional().isObject()], validate, asyncRoute(async (req, res) => {
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => ['name', 'phone', 'address'].includes(key)))
  if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'At least one profile field is required' })
  const profile = await Profile.findByIdAndUpdate((req as AuthRequest).user!.id, updates, { new: true }).select('-passwordHash')
  res.json({ success: true, message: 'Profile updated', data: profile })
}))

router.put('/change-password', protect, [body('newPassword').isLength({ min: 8 })], validate, asyncRoute(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.newPassword, 12)
  await Profile.findByIdAndUpdate((req as AuthRequest).user!.id, { passwordHash })
  res.json({ success: true, message: 'Password updated', data: null })
}))

router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], validate, asyncRoute(async (_req, res) => {
  res.json({ success: true, message: 'If the account exists, a reset email will be sent', data: null })
}))

router.post('/reset-password', protect, [body('newPassword').isLength({ min: 8 })], validate, asyncRoute(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.newPassword, 12)
  await Profile.findByIdAndUpdate((req as AuthRequest).user!.id, { passwordHash })
  res.json({ success: true, message: 'Password reset successfully', data: null })
}))

export default router
