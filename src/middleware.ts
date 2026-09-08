import type { NextFunction, Request, Response } from 'express'
import { validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import type { TokenUser } from './types.js'

export async function protect(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' })

  try {
    req.user = jwt.verify(token, config.accessSecret) as TokenUser
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired access token' })
  }
  next()
}

export function authorize(...roles: Array<'user' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admin access required' })
    next()
  }
}

export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() })
  next()
}

export function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next)
}
