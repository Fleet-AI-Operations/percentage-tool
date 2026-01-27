# Percentage Tool

A local-first AI alignment and data ingestion tool for evaluating task and feedback data.

## 📚 Documentation

Detailed documentation for developers and users can be found in the `Documentation` directory:

- [**Setup Guide**](./Documentation/SETUP.md) - How to configure your environment, database, and local AI (LM Studio).
- [**User Guide**](./Documentation/USER_GUIDE.md) - How to manage projects, ingest data, and interpret AI alignment scores.
- [**Vercel Deployment**](./Documentation/VERCEL.md) - Instructions for deploying to a Vercel serverless environment.

### 🏗 Architecture
- [**System Overview**](./Documentation/Architecture/OVERVIEW.md) - High-level tech stack and system diagrams.
- [**Ingestion & Queuing**](./Documentation/Architecture/INGESTION_FLOW.md) - Deep dive into background processes and memory management.
- [**AI Strategy**](./Documentation/Architecture/AI_STRATEGY.md) - Logic behind RAG-based alignment checks and embeddings.

## ✨ Core Features

- **🚀 Parallel Ingestion Pipeline**: Decouples high-speed data loading from AI vectorization. Ingest thousands of records instantly while embeddings generate in the background.
- **🧠 AI-Powered Alignment Analysis**: Automatically evaluate Tasks and Feedback against project-specific guidelines using local LLM models (Llama 3.1, Qwen, etc.).
- **📊 Bulk Analytics Engine**: Process entire datasets sequentially in the background. Includes real-time progress tracking and job cancellation support.
- **🛡️ Local-First Privacy**: Built specifically for local AI integration via LM Studio. No data leaves your machine during vectorization or analysis.
- **🎯 Semantic Search**: Find similar prompts and feedback across projects using vector embeddings (Cosine Similarity).
- **🛠️ Admin Console**: Centralized management for bulk data wipes, project context switching, and advanced maintenance tasks.
- **💎 Premium UI/UX**: Fully responsive, high-fidelity glassmorphism interface with interactive data visualizations and real-time status polling.
- **🧪 Quality Assurance**: Integrated unit testing (Vitest) and E2E testing (Playwright) suites for robust development.

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and update your `DATABASE_URL` and `LM Studio` settings.

3. **Initialize Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run Tests**:
   - Unit Tests: `npm test`
   - E2E Tests: `npm run test:e2e`

5. **Launch**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🛠 Tech Stack

- **Framework**: Next.js 15
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Local LLM/Embedding integration (via LM Studio)
- **Styling**: Premium Glassmorphism UI
- **Ingestion**: Decoupled parallel pipeline (Fast Data Load + Async Vectorization)

---

*This tool processes all data locally to ensure maximum privacy and compliance.*

## ✅ ToDo / Roadmap

- [ ] **API Ingestion**: Complete the refactor of the live endpoint sync engine (currently under construction).
- [ ] **Similarity Clustering**: Implement a view to group similar records by their vector embeddings for bulk analysis. More details and constraints are needed here.
- [ ] **Advanced Filtering**: Is this something we want? Should we be able to filter by different metadata fields?
- [ ] **Multi-Model Testing**: Enable a "comparison mode" to run the same alignment check across different LLM models.
