# 🚆 IRCTC Next-Gen High-Scalability Microservices Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.18-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v15-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v5-2D3748.svg)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-v7-DC382D.svg)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-v3-231F20.svg)](https://kafka.apache.org/)
[![ElasticSearch](https://img.shields.io/badge/ElasticSearch-v8-005571.svg)](https://www.elastic.co/)
[![Next.js](https://img.shields.io/badge/Next.js-v14-000000.svg)](https://nextjs.org/)

An enterprise-grade, high-scale Indian Railways Catering and Tourism Corporation (IRCTC) Railway Reservation backend engine engineered to handle high-concurrency peak traffic (such as Tatkal booking spikes of 100,000+ requests per minute).

Built using a **Microservices Architecture**, **Event-Driven Messaging (Kafka)**, **Distributed Mutex Locking (Redis Lua)**, **SAGA Orchestration Pattern**, and **Circuit Breaker Resiliency**.

---

## 📌 Core Architectural Highlights

- **High-Concurrency Seat Reservation Engine:** Employs Redis Mutex Locks to prevent race conditions and double-booking during high-concurrency Tatkal booking surges.
- **Segment-Based Seat Hop Optimization:** Maximizes train seat utilization by managing intermediate station segment availability (e.g. Delhi ➔ Kanpur and Kanpur ➔ Kolkata on the same physical seat).
- **Distributed SAGA Orchestration:** Manages multi-step booking and payment flows across independent services with automated background compensating transactions (rollback of expired or abandoned holds).
- **Event-Driven Microservices Communication:** Asynchronous messaging via Apache Kafka for auto-indexing routes in ElasticSearch, emitting seat availability updates, and processing PDF E-ticket notifications.
- **API Gateway Resiliency & Control:** Centralized request routing, JWT proxy authentication, Redis sliding-window rate limiting, and Circuit Breaker pattern to protect services against cascading failures.
- **Payment Idempotency & Webhook Deduplication:** Uses Redis `SETNX` locking to ensure payment webhooks and callbacks are processed exactly once.

---

## 🛠️ Microservices Ecosystem Summary

| Microservice | Primary Storage | Core Functionality |
| :--- | :--- | :--- |
| **`API Gateway`** | Redis | Central entry point, request routing, rate limiting, and circuit breaking. |
| **`User Service`** | PostgreSQL (Prisma) | User registration, OTP authentication, JWT token rotation, and sessions. |
| **`Admin Service`** | PostgreSQL (Prisma) | Station master data, train fleets, routes, and trip scheduling. |
| **`Search Service`** | ElasticSearch | High-speed station autocomplete and multi-hop route search. |
| **`Inventory Service`** | PostgreSQL (Prisma) | Segment-based seat hop matrix and seat hold/release lifecycle. |
| **`Booking Service`** | PostgreSQL & Redis | SAGA orchestrator for seat reservations, distributed locks, and PNR generation. |
| **`Payment Service`** | Redis | Razorpay gateway integration, webhook processing, and idempotency deduplication. |
| **`Notification Service`** | Redis | Kafka event consumer, PDF E-ticket generation, and email/SMS alerts. |

---

## 🌐 API Endpoint Architecture

All external traffic flows through the API Gateway endpoint routing structure:

### 🔐 Authentication & Users (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/send-otp` — Request registration OTP.
- `POST /api/v1/auth/verify` — Verify OTP and issue JWT access/refresh tokens.
- `POST /api/v1/auth/login` — Login with credentials.

### 🛠️ Railway Administration (`/api/v1/admin`)
- `POST /api/v1/admin/stations` — Add new station to network.
- `POST /api/v1/admin/trains` — Register train fleet.
- `POST /api/v1/admin/schedules` — Schedule trip and publish `admin.schedule.created` Kafka event.

### 🔍 Search & Seat Availability (`/api/v1/search`, `/api/v1/inventory`)
- `GET /api/v1/search/stations?q={query}` — Fuzzy station autocomplete.
- `GET /api/v1/inventory/availability` — Query seat availability for specific route segments.

### 🎟️ Bookings & Payments (`/api/v1/bookings`, `/api/v1/payments`)
- `POST /api/v1/bookings/reserve` — Initiate seat hold reservation and acquire Redis locks (SAGA Step 1).
- `POST /api/v1/bookings/{id}/create-payment-order` — Pre-create payment gateway order (SAGA Step 2).
- `POST /api/v1/payments/verify` — Verify payment signature and publish `payment.success` Kafka event (SAGA Step 3).

---

## ⚙️ Project Setup & Local Running Guide

### Prerequisites
- Node.js (v18+ or v20+)
- Docker & Docker Compose

### 1. Clone Project Repository & Install Root Dependencies
```bash
git clone https://github.com/GuptaAbhi09/IRCTC-Engine.git
cd IRCTC-Engine
npm install
```

### 2. Start Infrastructure Containers via Docker
```bash
docker-compose up -d
```

### 3. Initialize Database Schemas
```bash
cd user-service && npx prisma db push && cd ..
cd inventory-service && npx prisma db push && cd ..
cd booking-service && npx prisma db push && cd ..
```

### 4. Run Microservices
```bash
# Launch services individually or with process managers
node api-gateway/src/index.js
node user-service/src/index.js
node admin-service/src/index.js
node search-service/src/index.js
node inventory-service/src/index.js
node booking-service/src/index.js
node payment-service/src/index.js
node notification-service/src/index.js
```

### 5. Launch Next.js Web Frontend
```bash
cd frontend
npm run dev -- -p 3008
```

---

## 🧪 Verification & Testing

An automated verification test script is included to validate end-to-end integration across all 8 microservices, Redis distributed locking, and Kafka event publishing:

```bash
node scratch/testEndToEndFlow.js
```

---

## 👨‍💻 Author

- **Developer:** Abhi Gupta
- **GitHub Repository:** [GuptaAbhi09/IRCTC-Engine](https://github.com/GuptaAbhi09/IRCTC-Engine)
- **License:** MIT
