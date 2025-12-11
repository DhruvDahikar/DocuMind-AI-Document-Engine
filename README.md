# DocuMind: AI Document Engine

**DocuMind** is a multi-agent AI system designed to solve the "Unstructured Data Problem." It ingests chaotic documents—financial invoices, receipts, and complex legal contracts—and transforms them into structured, verifiable, and actionable intelligence.

Unlike standard LLM wrappers that simply "guess" at data, DocuMind implements a **Hybrid Intelligence Architecture**. It fuses the creative flexibility of Large Language Models with the strict reliability of deterministic algorithms to ensure data accuracy through mathematical validation and self-correction.

---

## 🚀 Live System Capabilities

### 1. Multi-Modal Ingestion (Universal Support)
The system is no longer limited to PDFs. DocuMind utilizes **LlamaParse** to natively read and extract data from a wide range of formats:
* **Documents:** `.pdf`, `.docx` (Word).
* **Images:** `.jpg`, `.png` (Scanned Receipts & Photos).

### 2. Smart Batch Processing
Designed for high-volume workflows, the platform features an **Intelligent Queue System**. Users can drag-and-drop multiple files simultaneously. The frontend orchestrator processes them sequentially with artificial delays to respect API rate limits (Quota Management) while maintaining a seamless user experience.

### 3. Hybrid Semantic Routing (Speed Optimized)
To optimize for cost and speed, DocuMind employs a **Two-Tier Classification System**:
* **Tier 1 (Heuristic):** A Python-based keyword scanner analyzes token density (e.g., "Total," "Whereas") to instantly classify documents without touching the LLM.
* **Tier 2 (AI Fallback):** If the heuristic score is ambiguous, the system escalates to the Semantic AI Agent for deep context analysis.
* **Manual Override:** Users have the option to force a specific processing pipeline via the UI.

---

## 🤖 Specialized AI Agents

Once classified, the document is handed off to a specialized agent trained for that specific domain.

### Agent A: The Financial Auditor (Invoices)
* **Goal:** Extract structured financial data with 100% arithmetic consistency.
* **Schema Extraction:** Identifies Vendor Name, Invoice IDs, Dates, Currency, and granular Line Items.
* **The "Self-Healing" Guardrail:** The core innovation. The agent does not blindly trust the LLM.
    1.  It extracts the Line Items and the Total Amount.
    2.  It runs a deterministic math check: `Sum(Line Items) == Total?`.
    3.  **Auto-Correction:** If the math fails (e.g., a missing tax line), the system calculates the delta, scans the raw text for that specific missing value, and injects it into the dataset to balance the ledger automatically.
* **Output:** Generates a validated Excel Spreadsheet (`.xlsx`) with explicit tax and total rows.

### Agent B: The Legal Analyst (Contracts)
* **Goal:** Risk assessment and executive summarization.
* **Entity & Date Resolution:** Extracts legally binding Effective Dates, Expiration Dates, and Signatories.
* **Risk Scoring Engine:** Scans the text for dangerous or non-standard clauses (e.g., indefinite liability, missing termination clauses) and assigns a **High**, **Medium**, or **Low** risk score.
* **Output:** Generates a comprehensive Text Report (`.txt`) with key terms and risk analysis.

---

## 💻 Technical Stack

DocuMind is built as a scalable, modern full-stack application.

### Frontend
* **Framework:** Next.js 14 (React) with TypeScript.
* **Styling:** Tailwind CSS with a custom Glassmorphism design system.
* **UX:** Dynamic Dashboards, Drag-and-Drop Batch Uploader, and Context-Aware Error Handling.
* **Visualization:** Lucide React Icons and animated status badges.

### Backend
* **Server:** FastAPI (Python 3.12) running asynchronously.
* **LLM Orchestration:** LlamaIndex & Google Gemini 1.5 Flash.
* **Validation Layer:** Custom Python middleware for JSON sanitization, Math Guardrails, and Heuristic Routing.
* **Parsing:** LlamaCloud API (Multi-Modal).

### Database
* **Core DB:** Supabase (PostgreSQL).
* **Security:** Row-Level Security (RLS) policies ensuring strict data isolation between users.
* **Persistence:** Extraction history, validation logs, and risk scores are persisted for long-term auditing.

---

## 🔮 Roadmap (Phase 2)

We have successfully completed Phase 1 (Core Engine, Multi-Format, Batching). The next development phase focuses on interactivity.

### RAG (Retrieval-Augmented Generation)
* **Objective:** "Chat with your Data."
* **Implementation:** Integrating **pgvector** into Supabase to store document embeddings.
* **Use Case:** Users will be able to ask natural language questions across their entire document history (e.g., *"How much did we pay Wayne Enterprises in Q1?"* or *"Show me all contracts with High Risk levels"*).

---

*DocuMind v1.0 (Beta) - Engineered by Dhruv Dahikar.*