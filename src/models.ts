import { Schema, model, type InferSchemaType } from 'mongoose'

const profileSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  phone: String,
  address: Schema.Types.Mixed,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true })

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  image: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
}, { timestamps: true })

const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  sizes: { type: [String], required: true },
  colors: { type: [String], required: true },
  images: { type: [String], required: true },
  stock: { type: Number, default: 0, min: 0 },
  brand: String,
  gender: { type: String, enum: ['men', 'women', 'kids', 'unisex'], required: true },
  sku: { type: String, required: true, unique: true, trim: true },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  ratingsAverage: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
}, { timestamps: true })

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  productSnapshot: { type: Schema.Types.Mixed, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: true })

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'Profile', default: null },
  customer: { type: Schema.Types.Mixed, required: true },
  shippingAddress: { type: Schema.Types.Mixed, required: true },
  paymentMethod: { type: String, enum: ['cod'], default: 'cod' },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  total: { type: Number, required: true, min: 0 },
  items: { type: [orderItemSchema], required: true },
}, { timestamps: true })

export const Profile = model('Profile', profileSchema)
export const Category = model('Category', categorySchema)
export const Product = model('Product', productSchema)
export const Order = model('Order', orderSchema)
export type ProfileDocument = InferSchemaType<typeof profileSchema>
