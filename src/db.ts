import mongoose from 'mongoose'
import { config } from './config.js'
import { Category } from './models.js'

const defaultCategories = [
  { name: 'Stitched', slug: 'stitched', description: 'Ready-to-wear stitched suits and collections' },
  { name: 'Unstitched', slug: 'unstitched', description: 'Unstitched fabrics and collections' },
]

export async function connectDatabase() {
  await mongoose.connect(config.mongoUri)
  await Promise.all(defaultCategories.map((category) => Category.findOneAndUpdate(
    { slug: category.slug },
    { $setOnInsert: category },
    { upsert: true, setDefaultsOnInsert: true },
  )))
  console.log('MongoDB connected')
}

export { mongoose }
