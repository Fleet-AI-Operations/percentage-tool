# Setup Guide

This guide will help you get the Percentage Tool up and running on your local machine.

## Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** database
- **LM Studio** (for local AI analysis)

## 1. Environment Configuration

Create a `.env` file in the root directory. Use the following structure:

```env
DATABASE_URL="postgres://user:password@localhost:5432/pertool"
AI_HOST="http://localhost:1234/v1"
LLM_MODEL="meta-llama-3.1-8b-instruct"
EMBEDDING_MODEL="text-embedding-qwen3-embedding-0.6b"
```

*Note: Ensure the model names match exactly what you have loaded in LM Studio.*

## 2. Install Dependencies

```bash
npm install
```

## 3. Database Initialization

This project uses Prisma (v7). Run the following commands to synchronize the schema:

```bash
npx prisma generate
npx prisma db push
```

## 4. Local AI Setup (LM Studio)

1. Open **LM Studio**.
2. **Search & Download**:
   - For Analysis: `Llama 3.1 8B Instruct` (or similar).
   - For Vectors: `Qwen 3 Embedding` or `Nomic Embed`.
3. **Load Models**: Load both a Chat model and an Embedding model.
4. **Start Server**: Start the **Local Server** in LM Studio on port 1234.
5. **GPU Acceleration**: Recommended for faster vectorization phases.

## 5. Running the Application

Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to begin.

## 6. Testing

The tool includes a suite of unit and end-to-end tests to ensure reliability.

### Unit Tests (Vitest)
Unit tests cover core logic, including AI utilities and math helpers.
```bash
npm test
```

### End-to-End Tests (Playwright)
E2E tests verify navigation, UI components, and critical workflows.
```bash
npm run test:e2e
```

---

## Maintenance & Recovery

- **Re-Generation**: If you pull new updates, run `npx prisma generate` to ensure the background job types are synced.
- **Port Conflict**: If port 3000 is busy, use `PORT=3001 npm run dev`.
- **Worker Recovery**: The system automatically attempts to resume `QUEUED_FOR_VEC` jobs on startup if a project is active.
