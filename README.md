# QR Café - Restaurant Ordering System

A mobile-first web app for QR-based ordering at restaurants, cafés, and food trucks in Morocco.

## ✨ Features

### Customer Side
- 📱 Scan QR code at table → menu opens automatically
- 🛒 View menu, add/remove items, see total
- 🌍 Trilingual support (English, French, Arabic)
- 🌓 Dark/Light mode
- 📊 Real-time order status tracking

### Staff Side
- 👨‍🍳 **Kitchen Dashboard**: View and manage order preparation
- 🧑‍💼 **Waiter View**: Accept/decline orders, mark as delivered
- 🔔 Real-time notifications for new orders

### Admin Side
- 🍽️ Menu management (CRUD with i18n)
- 🪑 Table management with QR generation
- 📈 Dashboard with stats
- 👥 Staff management

### Security
- 🔐 Dynamic QR codes that rotate periodically
- 📶 WiFi-based location validation (IP range)
- 🛡️ OWASP security best practices
- 🔑 JWT authentication for admin

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL with Prisma ORM |
| Real-time | Socket.io |
| QR Codes | qrcode library |

## 📁 Project Structure

```
project cafe/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   │   └── seed.js            # Demo data
│   ├── src/
│   │   ├── config/            # Database config
│   │   ├── middleware/        # Auth, WiFi, validation
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── socket/            # Real-time handlers
│   │   └── server.js          # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js pages
│   │   │   ├── admin/         # Admin pages
│   │   │   ├── kitchen/       # Kitchen dashboard
│   │   │   ├── waiter/        # Waiter dashboard
│   │   │   ├── menu/          # Customer menu
│   │   │   ├── cart/          # Cart page
│   │   │   └── order/[id]/    # Order tracking
│   │   ├── components/        # Reusable components
│   │   └── lib/               # API, store, socket
│   └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Setup PostgreSQL

```bash
# Create database
createdb qrcafe

# Or using psql
psql -U postgres -c "CREATE DATABASE qrcafe;"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed demo data
npm run seed

# Start development server
npm run dev
```

Backend runs on: http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on: http://localhost:3000

## 🔧 Configuration

### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/qrcafe"
JWT_SECRET="your-secret-key-change-in-production"
PORT=5000
FRONTEND_URL="http://localhost:3000"
QR_ROTATION_MINUTES=60
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 📱 Usage

### For Customers
1. Connect to restaurant WiFi
2. Scan QR code on table
3. Browse menu and add items to cart
4. Place order and track status

### For Staff
- **Waiter**: Go to `/waiter` to accept/manage orders
- **Kitchen**: Go to `/kitchen` to view and prepare orders

### For Admin
1. Go to `/admin`
2. Login with: `admin@cafedemo.ma` / `admin123`
3. Manage menu, tables, and view orders

## 🔐 Security Features

- **Dynamic QR Codes**: Rotate every 15-60 minutes
- **WiFi Validation**: Orders only allowed from registered IPs
- **Input Validation**: Joi schemas for all inputs
- **Rate Limiting**: Protection against abuse
- **CORS**: Configured for specific origins
- **Helmet**: Security headers
- **JWT**: Secure admin authentication

## 🌍 Internationalization

The app supports three languages:
- 🇬🇧 English (default)
- 🇫🇷 French
- 🇲🇦 Arabic (RTL)

Switch language using the language toggle in the header.

## 📊 API Endpoints

### Public
- `GET /api/qr/validate/:token` - Validate QR token
- `GET /api/menu/:restaurantId` - Get menu

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order status

### Admin (JWT required)
- `POST /api/auth/login` - Admin login
- `GET /api/admin/dashboard` - Stats
- `CRUD /api/menu` - Menu items
- `CRUD /api/tables` - Tables
- `POST /api/qr/generate/:tableId` - Generate QR

## 🤝 Contributing

This is an MVP. Future improvements:
- [ ] Payment integration
- [ ] Push notifications
- [ ] Analytics dashboard
- [ ] Multi-restaurant support
- [ ] Offline mode (PWA)

## 📄 License

MIT License - Free to use for personal and commercial projects.
