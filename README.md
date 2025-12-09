# 🧠 DocuMind: Autonomous Invoice Extraction System

### **What is this?**
DocuMind is an intelligent software that reads PDF invoices and automatically extracts data (like dates, vendor names, and line items) into a clean, structured format (JSON/Excel). 

**It is not just a standard AI wrapper.** It features a self-correcting engineering layer that mathematically validates data to prevent common AI hallucinations.

### **The Problem**
Businesses receive thousands of invoices in different formats. Humans have to manually type data into Excel.
* **It is slow.**
* **It is boring.**
* **Humans make typos.**

### **The Solution**
DocuMind automates this. You drag-and-drop a PDF, and seconds later, you get the data. No typing required.

---

## 🛠️ Engineering Highlights (Tier-1 Features)

This project implements a **"Hybrid Intelligence"** architecture to ensure reliability:

### 1. The Self-Correcting Validator (The "Math Check")
AI models sometimes miss "floating" numbers like Tax or Discounts in complex layouts. DocuMind solves this deterministically:
* **The Logic:** The system calculates `Sum(Line Items)` vs `Total Amount`.
* **The Fix:** If the math doesn't add up, the system calculates the exact missing gap (e.g., "72.41").
* **The Recovery:** It performs a regex search on the raw text for that specific number and retroactively fixes the dataset.

### 2. Event-Driven Feedback Loop
The user isn't left guessing. The UI visually communicates the system's actions:
* ✨ **Green Badge:** "Fixed by Engineering Validator" (The code caught an error and fixed it).
* ⚠️ **Yellow Badge:** "Manual Review Needed" (The math is off and needs human eyes).

---

## ⚙️ How It Works (The "Magic")

Imagine a digital assembly line with four workers:

1.  **The Eyes (LlamaParse):**
    * It looks at the PDF and understands the layout, distinguishing between tables, headers, and random text.
    * *Analogy:* Putting on reading glasses and transcribing the messy PDF into a neat notebook.

2.  **The Brain (Google Gemini Flash):**
    * We send that neat notebook to the AI with a strict "Blueprint." We ask it to extract specific fields.
    * *Analogy:* The smart accountant who reads the notes and fills out the official tax form.

3.  **The Auditor (Custom Python Logic):**
    * **This is the guardrail.** It checks the accountant's math. If the numbers don't match, it sends the form back for correction before the user ever sees it.
    * *Analogy:* The compliance officer who catches a mistake before the boss sees it.

4.  **The Boss (FastAPI & Next.js):**
    * Controls the flow and presents the final, polished result to the user via a modern web dashboard.

---

## 🏗️ The Technology Stack

* **Backend:** Python 3.12 & FastAPI (Async)
* **AI Model:** Google Gemini Flash (via LlamaIndex)
* **OCR / Parsing:** LlamaParse (Multimodal)
* **Frontend:** Next.js 14, React, Tailwind CSS
* **Engineering:** Custom Regex Heuristics & Pydantic Validation

---

## 🚀 How to Run This Project

### 1. Start the Backend (The Brain)
Open a terminal in the main folder:
```bash
# 1. Activate the sandbox (if using venv)
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# 2. Turn on the API server
uvicorn api:app --reload