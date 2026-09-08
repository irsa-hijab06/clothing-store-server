import { Router } from 'express'
import { body } from 'express-validator'
import { Order, Product } from '../models.js'
import { asyncRoute, protect, validate } from '../middleware.js'
import type { AuthRequest } from '../types.js'

const router = Router()
const objectIdPattern = /^[a-f\d]{24}$/i

router.post('/', [body('items').isArray({ min: 1 }), body('items.*.productId').custom((value) => (typeof value === 'string' || typeof value === 'number') && String(value).length > 0), body('items.*.quantity').isInt({ min: 1 }), body('items.*.name').optional().isString(), body('items.*.price').optional().isFloat({ min: 0 }), body('items.*.image').optional().isString(), body('shippingAddress').isObject(), body('paymentMethod').equals('cod'), body('customer').isObject()], validate, asyncRoute(async (req, res) => {
  const requestItems = req.body.items as Array<{ productId: string | number; quantity: number; name?: string; price?: number; image?: string }>
  const mongoIds = requestItems.filter((item) => objectIdPattern.test(String(item.productId))).map((item) => String(item.productId))
  const products = mongoIds.length ? await Product.find({ _id: { $in: mongoIds }, isActive: true }) : []
  if (products.length !== mongoIds.length) return res.status(400).json({ success: false, message: 'One or more products are unavailable' })
  let total = 0
  const items = requestItems.map((item) => {
    const product = products.find((entry) => String(entry._id) === String(item.productId))
    if (product && product.stock < item.quantity) throw new Error('Insufficient stock for one or more products')
    if (!product && (typeof item.price !== 'number' || !item.name)) throw new Error('Product details are required for local catalog items')
    const unitPrice = Number(product?.discountPrice ?? product?.price ?? item.price)
    total += unitPrice * item.quantity
    return { productId: product?._id, productSnapshot: { id: item.productId, name: product?.name || item.name, image: product?.images?.[0] || item.image, price: unitPrice }, quantity: item.quantity, unitPrice }
  })
  const order = await Order.create({ userId: null, customer: req.body.customer, shippingAddress: req.body.shippingAddress, paymentMethod: 'cod', total, items })
  res.status(201).json({ success: true, message: 'Order placed successfully', data: order })
}))

router.get('/mine', protect, asyncRoute(async (req, res) => {
  const orders = await Order.find({ userId: (req as AuthRequest).user!.id }).sort({ createdAt: -1 })
  res.json({ success: true, message: 'Orders loaded', data: orders })
}))

export default router
