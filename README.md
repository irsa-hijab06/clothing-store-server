# Clothing Store Backend

Express + MongoDB API for the clothing store frontend.

## Setup

1. Copy `.env.example` to `.env` and fill in the MongoDB URI and JWT secrets.
2. Run `npm install` inside `backend`.
3. Start MongoDB locally or create a MongoDB Atlas database.
4. Start with `npm run dev`.

The API runs on `http://localhost:5000/api`. The frontend currently points to the deployed API URL, so set its API base URL to the local backend when testing locally.

For the Vite frontend, create a root `.env` file with `VITE_API_URL=http://localhost:5000/api`. Checkout accepts MongoDB products and local catalog items by storing a product snapshot in the order.

Routes include auth, categories, products, admin user management, checkout orders, and cron health checks. MongoDB collections are created by Mongoose. Passwords are hashed with bcrypt and access tokens are signed JWTs. JWT secrets must never be exposed to the frontend.
