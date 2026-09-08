import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { Category, Product } from '../models.js'
import { asyncRoute, authorize, protect, validate } from '../middleware.js'
import type { AuthRequest } from '../types.js'

const router = Router()
const productRules = [body('name').trim().notEmpty(), body('description').trim().notEmpty(), body('price').isFloat({ min: 0 }), body('categories').isArray({ min: 1 }), body('sizes').isArray({ min: 1 }), body('colors').isArray({ min: 1 }), body('images').isArray({ min: 1 }), body('stock').isInt({ min: 0 }), body('gender').isIn(['men', 'women', 'kids', 'unisex']), body('sku').trim().notEmpty()]
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function serialize(product: any) {
  const value = product.toObject ? product.toObject() : product
  return { ...value, id: String(value._id), categories: (value.categories || []).map((category: any) => category.toObject ? { ...category.toObject(), id: String(category._id) } : category) }
}

router.get('/', [query('gender').optional().isIn(['men', 'women', 'kids', 'unisex']), query('search').optional().isString(), query('category').optional().isMongoId(), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })], validate, asyncRoute(async (req, res) => {
  const page = Number(req.query.page || 1); const limit = Number(req.query.limit || 10)
  const filter: any = { isActive: true }
  if (req.query.gender) filter.gender = req.query.gender
  if (req.query.search) filter.$or = [{ name: { $regex: escapeRegex(String(req.query.search)), $options: 'i' } }, { description: { $regex: escapeRegex(String(req.query.search)), $options: 'i' } }]
  if (req.query.category) filter.categories = req.query.category
  const [products, totalItems] = await Promise.all([Product.find(filter).populate('categories').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Product.countDocuments(filter)])
  res.json({ success: true, message: 'Products loaded', data: products.map(serialize), meta: { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page } })
}))

router.get('/category/:categoryId', [param('categoryId').isMongoId()], validate, asyncRoute(async (req, res) => {
  const products = await Product.find({ categories: req.params.categoryId, isActive: true }).populate('categories').sort({ createdAt: -1 })
  res.json({ success: true, message: 'Category products loaded', data: products.map(serialize) })
}))

router.get('/:id', [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('categories')
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
  res.json({ success: true, message: 'Product loaded', data: serialize(product) })
}))

router.post('/', protect, authorize('admin'), productRules, validate, asyncRoute(async (req, res) => {
  const categories = await Category.find({ _id: { $in: req.body.categories }, isActive: true }).select('_id')
  if (categories.length !== req.body.categories.length) return res.status(400).json({ success: false, message: 'One or more categories are invalid' })
  let product
  try {
    product = await Product.create({ ...req.body, discountPrice: req.body.discountPrice, createdBy: (req as AuthRequest).user!.id })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A product with this SKU already exists' })
    }
    throw error
  }
  await product.populate('categories')
  res.status(201).json({ success: true, message: 'Product created', data: serialize(product) })
}))

router.put('/:id', protect, authorize('admin'), [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const updates = { ...req.body, ...(req.body.discountPrice !== undefined ? { discountPrice: req.body.discountPrice } : {}) }
  const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('categories')
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
  res.json({ success: true, message: 'Product updated', data: serialize(product) })
}))

router.patch('/:id', protect, authorize('admin'), [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('categories')
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
  res.json({ success: true, message: 'Product updated', data: serialize(product) })
}))

router.delete('/:id', protect, authorize('admin'), [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id)
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
  res.json({ success: true, message: 'Product deleted', data: null })
}))

export default router
