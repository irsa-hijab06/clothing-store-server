import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { Order, Profile } from '../models.js'
import { asyncRoute, authorize, protect, validate } from '../middleware.js'
import type { AuthRequest } from '../types.js'

const router = Router()
router.use(protect, authorize('admin'))

router.get('/orders', [query('search').optional().isString()], validate, asyncRoute(async (req, res) => {
  const search = String(req.query.search || '').trim()
  const orders = await Order.find(search ? { $or: [{ 'customer.firstName': { $regex: search, $options: 'i' } }, { 'customer.lastName': { $regex: search, $options: 'i' } }, { 'customer.email': { $regex: search, $options: 'i' } }] } : {}).sort({ createdAt: -1 }).limit(100)
  res.json({ success: true, message: 'Orders loaded', data: orders })
}))

router.get('/users', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), query('search').optional().isString(), query('role').optional().isIn(['user', 'admin'])], validate, asyncRoute(async (req, res) => {
  const page = Number(req.query.page || 1); const limit = Number(req.query.limit || 10); const filter: any = {}
  if (req.query.search) filter.name = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
  if (req.query.role) filter.role = req.query.role
  const [users, total] = await Promise.all([Profile.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Profile.countDocuments(filter)])
  res.json({ success: true, message: 'Users loaded', data: { users, total, page, limit, totalPages: Math.ceil(total / limit) } })
}))

router.get('/users/:id', [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const user = await Profile.findById(req.params.id).select('-passwordHash')
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })
  res.json({ success: true, message: 'User loaded', data: user })
}))

router.put('/users/:id', [param('id').isMongoId(), body('name').optional().trim().notEmpty(), body('phone').optional().isString(), body('address').optional().isObject(), body('is_verified').optional().isBoolean()], validate, asyncRoute(async (req, res) => {
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => ['name', 'phone', 'address', 'is_verified'].includes(key)))
  if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No valid profile fields provided' })
  const user = await Profile.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-passwordHash')
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })
  res.json({ success: true, message: 'User updated', data: user })
}))

router.patch('/users/:id/role', [param('id').isMongoId(), body('role').isIn(['user', 'admin'])], validate, asyncRoute(async (req, res) => {
  if (req.params.id === (req as AuthRequest).user!.id) return res.status(400).json({ success: false, message: 'You cannot change your own role' })
  const user = await Profile.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true, runValidators: true }).select('-passwordHash')
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })
  res.json({ success: true, message: 'Role updated', data: user })
}))

router.delete('/users/:id', [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  if (req.params.id === (req as AuthRequest).user!.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account' })
  const user = await Profile.findByIdAndDelete(req.params.id)
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })
  res.json({ success: true, message: 'User deleted', data: null })
}))

export default router
