# STOKKO

**Food Price Intelligence & Marketplace Platform**

STOKKO is a full-stack marketplace that connects food commodity buyers and sellers, combining a traditional online store experience with real-time price tracking and market insight tools, helping buyers shop smarter and sellers price competitively.

🔗 **Live Demo:** [stokko-app.vercel.app](https://stokko-app.vercel.app)

---

## Overview

Buyers and sellers need more than just a place to list and purchase products — they need visibility into pricing trends to make informed decisions. STOKKO addresses this by pairing a standard e-commerce flow (browsing, cart, checkout, orders) with a dedicated **Price Insights** module and seller side **sales analytics**, all wrapped in role-based dashboards for Buyers and Sellers.

## Features

### For Buyers
- Browse and search the product marketplace
- Shopping cart and checkout flow
- Order history and tracking
- Price Insights and track commodity price trends over time
- Notifications
- Premium subscription plan

### For Sellers
- Seller dashboard with store management
- Product listing management
- Order fulfillment
- Sales analytics
- Notifications
- Premium subscription plan

### Platform-wide
- Email/password authentication with JWT
- Google OAuth 2.0 sign-in
- Role-based access (Buyer / Seller)
- Product image uploads via Cloudinary

## Tech Stack

**Backend**
- Node.js + Express
- MySQL (hosted on Aiven)
- JWT authentication
- Passport.js (Google OAuth 2.0)
- Cloudinary (image storage)

**Frontend**
- HTML, CSS, JavaScript (vanilla)
- Separate Buyer and Seller interfaces

**Infrastructure**
- Backend deployed on [Railway](https://railway.app)
- Frontend deployed on [Vercel](https://vercel.com)
- Database hosted on [Railway](https://railway.app)

## Project Structure

```
STOKKO/
├── backend/
│   ├── src/
│   │   ├── config/          # passport, db config
│   │   ├── controllers/     # route logic
│   │   ├── middleware/      # auth, premium checks
│   │   ├── models/          # database models
│   │   ├── routes/          # API routes
│   │   ├── db/               # SQL schema
│   │   └── app.js
│   └── package.json
│
└── frontend/
    ├── buyer/                # buyer-facing pages
    ├── seller/                # seller-facing pages
    └── screens/               # landing, login, register
```

## Getting Started (Local Development)

### Prerequisites
- Node.js (v18+ recommended)
- A MySQL database (local or hosted)
- A Google Cloud project with OAuth 2.0 credentials
- A Cloudinary account

### 1. Clone the repository
```bash
git clone https://github.com/saturnilu/stokko-app.git
cd stokko/backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file inside `backend/` with the following keys (see `.env.example` if provided, or the list below):

```
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASS=

JWT_SECRET=
JWT_EXPIRES_IN=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SESSION_SECRET=
CLIENT_URL=
```

### 4. Import the database schema
Import `backend/src/db/stokko.sql` into your MySQL database.

### 5. Run the backend
```bash
npm start
```

### 6. Run the frontend
Serve the `frontend/` folder with any static server (e.g. VS Code Live Server), and open `frontend/index.html`.

## Author

**Naila Riani**
Computer Science Student, Bina Nusantara University
