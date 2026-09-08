import type { Request } from 'express'

export type TokenUser = { id: string; email: string; role: 'user' | 'admin' }

export type AuthRequest = Request & {
  user?: TokenUser
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenUser
    }
  }
}
