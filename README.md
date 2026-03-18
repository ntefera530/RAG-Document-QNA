# DocMind — AI Document Q&A

Upload your documents and ask questions about them using a fully local AI. No data leaving your machine!

---

## What It Does

- Upload **PDF, TXT, or Markdown** files
- Ask questions about your documents
- Get answers based on your document content
- Chat history remembered within each session
- Delete documents you no longer need

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Nginx |
| Backend | Java 21, Spring Boot 4, Spring AI |
| Database | PostgreSQL + PGVector |
| AI (Chat) | Llama 3.1 8B via Ollama |
| AI (Embeddings) | nomic-embed-text via Ollama |
| Infrastructure | Docker Compose |

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- 10GB+ free disk space (for AI models)
- 8GB+ RAM recommended

No Java or Node.js installation required.

---

## Getting Started

**1. Clone the repository**
```bash
git clone https://github.com/ntefera530/rag-document-qna.git
cd rag-document-qna
```

**2. Set up your environment**
```bash
cp .env.example .env
```
Edit `.env` if you'd like to change the default database credentials.

**3. Start everything**
```bash
docker compose up
```

> The first run downloads the AI models (~5GB) and may take 10-15 minutes. Subsequent starts are fast.

**4. Open the app**

Visit [http://localhost:3000](http://localhost:3000)

---

## How To Use

1. **Upload** — drag and drop or click to upload a PDF, TXT, or MD file
2. **Refresh** — click Refresh to see your document once it's processed
3. **Ask** — type a question and press Send
4. **Scope** — click a document to ask questions about that specific file
5. **New Chat** — start a fresh conversation at any time

---

## Stopping the App

```bash
# Stop but keep your data
docker compose down

# Stop and wipe all data (documents, chat history, models)
docker compose down -v
```

---

## Project Structure

```
rag-document-qna/
├── backend/                  # Spring Boot REST API
├── frontend/                 # React app served by Nginx
├── compose.yaml              # Docker orchestration
├── ollama-init.sh            # Pulls AI models on first run
├── .env.example              # Environment variable template
└── README.md
```

---

## License

MIT