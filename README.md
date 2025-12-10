# DocuMind: Autonomous AI Document Intelligence Platform

**DocuMind** is an enterprise-grade, multi-agent AI system designed to solve the "Unstructured Data Problem." It ingests chaotic documents—financial invoices, receipts, and complex legal contracts—and transforms them into structured, verifiable, and actionable intelligence.

Unlike standard LLM wrappers that simply "guess" at data, DocuMind implements a **Hybrid Intelligence Architecture**. It fuses the creative flexibility of Large Language Models with the strict reliability of deterministic algorithms to ensure data accuracy through mathematical validation and self-correction.

---

## System Architecture & Philosophy

The platform operates on a **Hub-and-Spoke** design pattern, where a central orchestration layer creates a dynamic pipeline based on the specific context of the uploaded file.

### 1. Ingestion & Optical Character Recognition (OCR)
The entry point utilizes **LlamaParse**, a state-of-the-art multimodal parser capable of understanding complex layouts, tables, and nested data structures that traditional OCR tools often miss. This ensures the raw text fed into the AI is high-fidelity.

### 2. The Semantic Router
DocuMind does not require user tagging. A dedicated routing agent analyzes the initial vector embedding of the document to determine its intent:
* **Financial Vectors:** Invoices, Purchase Orders, Receipts.
* **Legal Vectors:** NDAs, Employment Agreements, MSA Contracts.
* **Fallback:** Unrecognized documents are flagged for manual review.

---

## Specialized AI Agents

Once classified, the document is handed off to a specialized agent trained for that specific domain.

### Agent A: The Financial Auditor (Invoices)
* **Goal:** Extract structured financial data with 100% arithmetic consistency.
* **Schema Extraction:** Identifies Vendor Name, Invoice IDs, Dates, Currency, and granular Line Items.
* **The "Self-Healing" Guardrail:** This is the core innovation. The agent does not blindly trust the LLM.
    1.  It extracts the Line Items and the Total Amount.
    2.  It runs a deterministic math check: `Sum(Line Items) == Total?`.
    3.  **If Math Fails:** The system calculates the delta (difference), uses Regex to scan the raw text for that specific missing value (usually a hidden Tax or Discount), and automatically injects it into the dataset to balance the ledger.
* **Output:** Generates a clean, validated Excel Spreadsheet (`.xlsx`).

### Agent B: The Legal Analyst (Contracts)
* **Goal:** Risk assessment and executive summarization.
* **Entity & Date Resolution:** Extracts legally binding Effective Dates, Expiration Dates, and Signatories.
* **Risk Scoring Engine:** Scans the text for dangerous or non-standard clauses (e.g., indefinite liability, missing termination clauses) and assigns a **High**, **Medium**, or **Low** risk score.
* **Output:** Generates a comprehensive Text Report (`.txt`) suitable for legal review.

---

## Technical Stack

DocuMind is built as a scalable, modern full-stack application.

### Frontend
* **Framework:** Next.js 14 (React) with TypeScript.
* **Styling:** Tailwind CSS with a custom Glassmorphism design system.
* **UX:** Dynamic Dashboards that adapt the UI based on document type (e.g., Financial Tables vs. Risk Analysis Cards).
* **Visualization:** Lucide React Icons and animated status badges.

### Backend
* **Server:** FastAPI (Python 3.12) running asynchronously for non-blocking I/O.
* **LLM Orchestration:** LlamaIndex & Google Gemini 1.5 Flash.
* **Validation Layer:** Custom Python middleware for JSON sanitization and logic checks.
* **Parsing:** LlamaCloud API.

### Database
* **Core DB:** Supabase (PostgreSQL).
* **Security:** Row-Level Security (RLS) policies ensuring strict data isolation between users.
* **Persistence:** All extraction history, validation logs, and risk scores are persisted for long-term auditing.

---

## Roadmap & Future Features

I am actively developing Phase 2 of the platform to expand ingestion capabilities and interactivity.

### 1: Multi-Format Ingestion
* **Objective:** Break the dependency on PDFs.
* **Implementation:** Adding support for `.jpg`/`.png` (Mobile receipts) and `.docx` (Word Contracts) via new parsing pipelines.

### 2: RAG (Retrieval-Augmented Generation)
* **Objective:** "Chat with your Data."
* **Implementation:** Integrating **pgvector** into Supabase to store document embeddings. Users will be able to ask natural language questions across their entire document history (e.g., *"Show me all invoices from Wayne Enterprises > $500"*).

### 3: Enterprise Batch Processing
* **Objective:** High-volume throughput.
* **Implementation:** Asynchronous background queues (Celery/Redis) to handle bulk uploads of 50+ files simultaneously without server blocking.

---

*DocuMind v1.0 (Beta) - Engineered by Dhruv Dahikar.*