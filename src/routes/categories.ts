import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { Category } from '../models.js'
import { asyncRoute, authorize, protect, validate } from '../middleware.js'
import { slugify } from '../utils.js'
import type { AuthRequest } from '../types.js'

const router = Router()

function serialize(category: any) {
  const value = category.toObject ? category.toObject() : category
  return { ...value, id: String(value._id) }
}

router.get('/', [query('search').optional().isString()], validate, asyncRoute(async (req, res) => {
  const filter = { isActive: true, ...(req.query.search ? { name: { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {}) }
  const categories = await Category.find(filter).sort({ name: 1 })
  res.json({ success: true, message: 'Categories loaded', data: categories.map(serialize) })
}))

router.get('/:id', asyncRoute(async (req, res) => {
  const id = String(req.params.id)
  const category = await Category.findOne({ $or: [{ slug: id }, ...(id.match(/^[a-f\d]{24}$/i) ? [{ _id: id }] : [])] })
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' })
  res.json({ success: true, message: 'Category loaded', data: serialize(category) })
}))

router.post('/', protect, authorize('admin'), [body('name').trim().notEmpty(), body('description').optional().isString(), body('image').optional().isURL()], validate, asyncRoute(async (req, res) => {
  try {
    const category = await Category.create({ ...req.body, slug: slugify(req.body.name), createdBy: (req as AuthRequest).user!.id })
    res.status(201).json({ success: true, message: 'Category created', data: category })
  } catch (error) { res.status(409).json({ success: false, message: error instanceof Error ? error.message : 'Category already exists' }) }
}))

async function updateCategory(req: any, res: any) {
  const updates = { ...req.body, ...(req.body.name ? { slug: slugify(req.body.name) } : {}) }
  const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' })
  res.json({ success: true, message: 'Category updated', data: category })
}
router.put('/:id', protect, authorize('admin'), [param('id').isMongoId()], validate, asyncRoute(updateCategory))
router.patch('/:id', protect, authorize('admin'), [param('id').isMongoId()], validate, asyncRoute(updateCategory))
router.delete('/:id', protect, authorize('admin'), [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id)
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' })
  res.json({ success: true, message: 'Category deleted', data: null })
}))

export default router
