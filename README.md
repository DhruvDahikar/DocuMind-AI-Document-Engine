# 🧠 DocuMind-AI-Document-Engine

**Hi there! 👋 Welcome to my AI engineering playground.**

**DocuMind** is my attempt to solve a boring real-world problem with some exciting new tech. It's an autonomous platform that ingests messy, unstructured documents (PDFs, images) and transforms them into clean, reliable data—without human help.

It’s not just a wrapper around Gemini. I built a **Multi-Agent Architecture** that "thinks" before it extracts. It classifies documents, routes them to specialist agents, and even uses a deterministic math-layer to fact-check the AI before you ever see the result.

---

## 🏗️ The Architecture (How it works)

I didn't want a "black box" system. I designed a Hub-and-Spoke architecture where different parts of the code handle different cognitive tasks.

Here is the flow of data through the system:

```mermaid
graph TD
    User[User Upload] --> Frontend[Next.js Dashboard]
    Frontend --> Backend[FastAPI Brain]
    
    subgraph "The Intelligence Layer"
        Backend --> LlamaParse[LlamaParse OCR]
        LlamaParse --> Router{The 'Sorting Hat'}
        
        Router -- "It's an Invoice" --> InvoiceAgent[Invoice Specialist]
        Router -- "It's a Contract" --> ContractAgent[Contract Specialist]
        Router -- "Unknown" --> Fallback[Fallback Handler]
        
        InvoiceAgent --> Validator{The Math Auditor}
        Validator -- "Math Mismatch" --> SelfHeal[Auto-Correction Regex]
        Validator -- "Math OK" --> FinalData
        SelfHeal --> FinalData
    end
    
    FinalData --> DB[(Supabase Cloud DB)]
    DB --> Dashboard[User History & Analytics]

1. The "Sorting Hat" (Semantic Router) 🎩
Instead of blindly forcing every file into an invoice template, I built a router that reads the first 2,000 tokens of a document. It asks: "Is this an invoice, a receipt, or a legal contract?" and dispatches the file to the correct logic path.

2. The "Math Auditor" (Self-Healing Logic) 🕵️‍♂️
LLMs are great at reading, but bad at math. I noticed Gemini sometimes hallucinated "floating" tax numbers in complex tables.

My Solution: I wrote a Python layer that intercepts the JSON output. It sums up the line items and compares them to the Total.

The Cool Part: If the math doesn't add up, the system calculates the exact missing difference (e.g., "72.41"), regex-searches the raw text for that number, and auto-corrects the data on the fly.

3. Persistent Memory (Cloud Database) ☁️
I integrated Supabase (PostgreSQL) with Row-Level Security. This means users can log in, save their extraction history, and access their past documents from any device. It's a full-stack SaaS, not just a script.

🛠️ The Tech Stack
I chose these tools to balance speed, reliability, and cost:

The Brain: Python 3.12 + FastAPI (Async)

The Face: Next.js 14 (React) + Tailwind CSS + Lucide Icons

The Intelligence: Google Gemini Flash 1.5 (via LlamaIndex)

The Eyes: LlamaParse (Multimodal OCR)

The Memory: Supabase (Postgres + Auth)

DevOps: Docker ready (coming soon)

⚡ How to Run It Locally
Want to break things? Feel free to clone this and run it yourself.

Prerequisites
Node.js & npm

Python 3.10+

Keys: Google AI Studio Key, LlamaCloud Key, Supabase Project

git clone
cd DocuMind-AI-Document-Engine

# Setup the environment
# (Create a .env file with GOOGLE_API_KEY and LLAMA_CLOUD_API_KEY)

# Start the server
uvicorn api:app --reload

You should see the "Sorting Hat" logs in your terminal when you upload a file!

2. Spin up the Frontend 💻
Open a new terminal window:

cd frontend

# Install the goods
npm install

# Setup the environment
# (Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)

# Launch
npm run dev

3. Usage
Go to http://localhost:3000, sign up (it uses your local Supabase instance), and drop in a PDF.

🔮 What's Next?
I'm not done yet. Here is what I am building next:

[ ] Contract Analysis Agent: To summarize legal risks, not just extract money.

[ ] Chat with Data: Adding a Vector DB so you can ask "How much did we spend on AWS last month?"

[ ] Batch Processing: Drag and drop 50 files at once.

Thanks for checking this out! If you have questions feel free to open an issue.