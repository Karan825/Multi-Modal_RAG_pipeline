# Multi-Modal Document Intelligence & RAG Pipeline

![Pipeline Demo](Qatar-ezgif.com-video-to-gif-converter%20(1).gif)

A production-grade **Multi-Modal Document Intelligence system** that ingests PDFs, extracts **text, tables, and images**, applies **OCR**, builds **semantic embeddings**, indexes them using **FAISS**, and enables **retrieval-augmented question answering (RAG)** with **source-grounded citations**.

This project mirrors real-world enterprise document understanding systems used for invoices, research papers, reports, and compliance documents.

## Key Features

- **Multi-modal PDF ingestion**:
  - Native text extraction
  - Table-like structure extraction
  - Image extraction with OCR (Tesseract)
- Unified chunk representation across modalities
- Semantic embedding generation using HuggingFace models
- Vector search powered by **FAISS**
- **Retrieval-Augmented Generation (RAG)** with:
  - Context grounding
  - Source attribution
  - Page-level citations
- Pluggable LLM backend (local HuggingFace or Groq)
- Persistent vector store for fast reloads
- Clean, step-wise pipeline architecture

## System Architecture

```mermaid
graph TD
    A[PDF Document] --> B[Extraction Layer]
    B --> C[Text Extraction<br>PyMuPDF]
    B --> D[Table Extraction<br>Layout Heuristics]
    B --> E[Image Extraction<br>PDF Embedded Images]
    C --> F[OCR Layer<br>Tesseract on Images]
    D --> F
    E --> F
    F --> G[Chunk Normalization<br>Unified Chunk Schema]
    G --> H[Embedding Layer<br>HuggingFace Sentence Embeddings]
    H --> I[Vector Store<br>FAISS<br>Cosine Similarity via L2 Normalization]
    I --> J[Retrieval<br>Top-K Semantic Search]
    J --> K[LLM QA<br>Context-Grounded Answers<br>Source Citations]
