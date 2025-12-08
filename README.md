# 🧠 DocuMind: The AI Invoice Extractor

### **What is this?**
DocuMind is an intelligent software that reads PDF invoices and automatically extracts data (like dates, vendor names, and line items) into a clean, structured format (JSON/Excel).

### **The Problem**
Businesses receive thousands of invoices in different formats (PDFs, scans, photos). A human has to open each one, read the total, read the date, and type it into Excel manually.
* **It is slow.**
* **It is boring.**
* **Humans make typos.**

### **The Solution**
DocuMind automates this. You drag-and-drop a PDF, and 5 seconds later, you get the data. No typing required.

---

## 🛠️ How It Works (The "Magic")

Imagine a digital assembly line with three workers:

1.  **The Eyes (LlamaParse):**
    * This tool looks at the PDF. It doesn't just "see" text; it understands layout. It knows that a number inside a grid is part of a "Table," not just a random phone number.
    * *Analogy:* It puts on reading glasses and transcribes the messy PDF into a neat notebook.

2.  **The Brain (Google Gemini 2.0 Flash):**
    * We send that neat notebook to Google's AI. We give it a strict set of rules (a "Blueprint"). We say: "Find the Total Amount and give it to me as a number, not text."
    * *Analogy:* The smart accountant who reads the notes and fills out the official tax form perfectly.

3.  **The Boss (Python & FastAPI):**
    * This controls the flow. It takes the file from the user, hands it to the Eyes, passes the notes to the Brain, and delivers the final result back to the user.

---

## 🏗️ The Technology Stack (Under the Hood)

For the tech-savvy folks, here is what runs this engine:

* **Backend (The Engine):** Python 3.12
    * *Why?* It's the language of AI.
* **API Framework:** FastAPI
    * *Why?* It creates a web server so our frontend website can talk to the Python script.
* **AI Model:** Gemini 2.0 Flash (via Google GenAI)
    * *Why?* It is incredibly fast and currently free to use.
* **OCR / Parsing:** LlamaParse
    * *Why?* Standard OCR fails at complex tables. LlamaParse specializes in understanding document structures.
* **Frontend (The Face):** Next.js & Tailwind CSS
    * *Why?* Builds a modern, responsive website that looks professional (like a real SaaS product).

---

## 🚀 How to Run This Project

### 1. Start the Backend (The Brain)
Open a terminal in the main folder:
```bash
# Activate the sandbox
venv\Scripts\activate

# Turn on the API server
uvicorn api:app --reload