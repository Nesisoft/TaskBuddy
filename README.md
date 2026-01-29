# task-buddy

## Setup Instructions

### 1. Install dependencies
From the root directory:
```bash
npm install
```

### 2. Set up the backend environment
```bash
cd backend
cp .env.example .env
```
Edit `.env` and update `DATABASE_URL` to match your PostgreSQL connection.

### 3. Create the PostgreSQL database
```bash
createdb taskbuddy
```

### 4. Run database migrations
From the backend directory:
```bash
cd backend
npx prisma migrate dev
```

Or from the root directory:
```bash
npm run db:migrate
```

### 5. Generate Prisma client
```bash
cd backend
npx prisma generate
```

### 6. Start the application
From root:
```bash
npm run dev
```

#### Running services:
- **Backend:** http://localhost:3001
- **Frontend:** http://localhost:3000