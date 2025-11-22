# Full E‑Commerce Backend (Node.js + Express + MongoDB)
This project is a **production‑grade e‑commerce backend** featuring:
- Full authentication (JWT, 2FA, email verification)
- Complete product system (products, categories, reviews)
- Cart & coupon flow (soft preview + strict checkout validation)
- Order management (atomic checkout, stock management, returns)
- Payment processing (Stripe, PayPal, COD)
- Admin dashboard (users, orders, analytics, logs)
- Secure architecture following industry standards
- Fully structured **Postman Collection** included

---

# 📌 Tech Stack
| Layer | Technology |
|------|------------|
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT, bcrypt, 2FA (TOTP), Email verification |
| Payments | Stripe, PayPal, COD |
| Logging | Winston + Daily Rotate File |
| API Testing | Postman |
| Validation | Joi / Mongoose Validators |
| Security | Helmet, Rate Limiting, Sanitization |

---

# 📦 Project Structure

```
/models
  Cart.js
  Coupon.js
  Product.js
  Order.js
  User.js
  Review.js
  Game.js
  PrebuiltPc.js

/controllers
  authController.js
  userController.js
  productController.js
  cartController.js
  orderController.js
  paymentController.js
  adminController.js
  logController.js

/routes
  authRoutes.js
  userRoutes.js
  productRoutes.js
  cartRoutes.js
  orderRoutes.js
  paymentRoutes.js
  adminRoutes.js

/utils
  appError.js
  email.js
  logger.js
  authMiddleware.js
```

---

# 🔐 Authentication Flow
### Includes:
- Registration with email verification
- Login with JWT access tokens
- Optional 2FA (Time‑Based OTP)
- Forgot & reset password
- Update password with old password + 2FA
- “Protect” middleware for secure route access

---

# 🛒 Cart + Coupon System

## 🟦 **Cart is Preview Mode**
When a user applies a coupon:

```
POST /cart/coupon
```

Backend:
- Validates coupon existence & active state  
- Shows *preview* discount  
- Does NOT enforce rules  
- Does NOT deduct stock  
- Does NOT increase coupon usage  

_User can see discount preview but it is not guaranteed._

---

## 🟥 **Checkout is Strict Validation Mode**
When user places an order:

```
POST /orders
```

Backend performs **all strict checks**:
- Coupon validity  
- Start/end date  
- Min/max order value  
- Applies to product / category?  
- Per‑user usage?  
- Global usage limit?  
- Stock availability  
- Idempotency protection  
- Atomic transaction:
  1. Validate coupon  
  2. Validate stock  
  3. Deduct stock  
  4. Increment coupon usage  
  5. Create order  
  6. Clear cart  
  7. Commit  

If anything fails → rollback.

---

# 🧾 Orders & Payments Flow

### ✔ Flow:
1. Order is created  
2. Stock locked  
3. User redirected to payment  
4. Payment processed  
5. Order marked as **paid**

Supported:
- Stripe
- PayPal
- Cash On Delivery

---

# 🛠 Admin Features
Admins can:
- View sales analytics  
- Product analytics  
- User management (CRUD + roles)  
- Product management (CRUD)  
- Order management (status, refunds, returns)  
- Coupon management  
- Logging system  

---

# 📊 Logging System
Admins can:
- View all logs  
- View logs by ID  
- Get log dates  
- Get log stats by date  

---

# 🧪 Postman Collection
Full Postman collection included with:
- Structured URLs (`raw`, `host`, `path`, `query`)
- Examples
- Edge cases
- Flow-ready requests

Download file: `ecommerce_postman_collection_structured.json`

---

# 🚀 How to Run

## 1️⃣ Install
```
npm install
```

## 2️⃣ Environment Variables
Create `.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_jwt_secret
JWT_EXPIRES=7d

EMAIL_USERNAME=your_email
EMAIL_PASSWORD=your_email_password

STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...

NODE_ENV=development
```

## 3️⃣ Start
```
npm run dev
```

---

# 🔒 Security
- Helmet  
- Sanitization  
- Rate limiting  
- Enforced JWT  
- Password hashing  
- 2FA  
- Idempotent order creation  
- Atomic stock updates  
- No coupon snapshots in cart  

---

# 🧹 Code Architecture
- Controller → Service → Model separation  
- Atomic transactions  
- Central error handling  
- Logging pipeline  
- Clean helper utilities  

---

# 🎯 Improvements Over Standard Backends
- Soft vs strict coupon system  
- Fully structured Postman collection  
- 2FA integrated routes  
- Admin log analytics  
- Atomic checkout  
- Query-structured URLs  

---

# 🎉 Final Notes
This backend is:
- Secure  
- Scalable  
- Production‑ready  
- Easy to extend  
- Frontend‑friendly  

