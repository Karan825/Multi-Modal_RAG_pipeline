import os
import sys
import uuid
import shutil
from datetime import datetime
from dotenv import load_dotenv

# Ensure parent directory is in python search path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()

from fastapi import FastAPI, Depends, Response, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase.client import create_client, Client
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List

# RAG Modules Imports
import config
from vector_store import VectorStore
from llm_qa import LLMQA, SimpleQA
from document_processor import DocumentProcessor

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://your-frontend.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set")

client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# ----------------- INITIALIZE RAG CORE -----------------
config.create_directories()

vector_store = VectorStore(model_name=config.EMBEDDING_MODEL)
if os.path.exists(config.VECTOR_STORE_PATH):
    try:
        vector_store.load(config.VECTOR_STORE_PATH)
        print("[OK] Vector Store loaded successfully")
    except Exception as e:
        print(f"[WARN] Failed to load vector store: {e}. Starting fresh.")
else:
    print("[WARN] No pre-existing Vector Store index found. Will create dynamically.")

try:
    qa_system = LLMQA(model_name=config.LLM_MODEL)
    print(f"[OK] LLM QA system initialized with {config.LLM_MODEL}")
except Exception as e:
    print(f"[WARN] Failed to initialize LLM QA: {e}. Falling back to SimpleQA.")
    qa_system = SimpleQA()

# ----------------- IN-MEMORY FALLBACK DATABASE -----------------
IN_MEMORY_CHATS = {}
IN_MEMORY_MESSAGES = {}
IN_MEMORY_DOCUMENTS = {}

def get_sessions_fallback(user_id: str):
    user_chats = [chat for chat in IN_MEMORY_CHATS.values() if chat["user_id"] == user_id]
    return sorted(user_chats, key=lambda c: c["created_at"], reverse=True)

def create_session_fallback(user_id: str, title: str):
    chat_id = str(uuid.uuid4())
    new_chat = {
        "id": chat_id,
        "user_id": user_id,
        "title": title,
        "created_at": datetime.utcnow().isoformat()
    }
    IN_MEMORY_CHATS[chat_id] = new_chat
    IN_MEMORY_MESSAGES[chat_id] = []
    return new_chat

# Final reload 5
def delete_session_fallback(chat_id: str):
    if chat_id in IN_MEMORY_CHATS:
        del IN_MEMORY_CHATS[chat_id]
    if chat_id in IN_MEMORY_MESSAGES:
        del IN_MEMORY_MESSAGES[chat_id]
    return {"message": "Chat deleted"}

def get_messages_fallback(chat_id: str):
    return IN_MEMORY_MESSAGES.get(chat_id, [])

def add_message_fallback(chat_id: str, sender: str, text_content: str, media_url: Optional[str] = None, citations: Optional[list] = None):
    msg = {
        "id": str(uuid.uuid4()),
        "session_id": chat_id,
        "sender": sender,
        "text_content": text_content,
        "media_url": media_url,
        "citations": citations or [],
        "created_at": datetime.utcnow().isoformat()
    }
    if chat_id not in IN_MEMORY_MESSAGES:
        IN_MEMORY_MESSAGES[chat_id] = []
    IN_MEMORY_MESSAGES[chat_id].append(msg)
    return msg

def get_documents_fallback(user_id: str):
    return [doc for doc in IN_MEMORY_DOCUMENTS.values() if doc["user_id"] == user_id]

def add_document_fallback(user_id: str, name: str, chunk_count: int, file_path: str):
    doc_id = str(uuid.uuid4())
    new_doc = {
        "id": doc_id,
        "user_id": user_id,
        "name": name,
        "chunk_count": chunk_count,
        "file_path": file_path,
        "created_at": datetime.utcnow().isoformat()
    }
    IN_MEMORY_DOCUMENTS[doc_id] = new_doc
    return new_doc

# ----------------- AUTH ENDPOINTS -----------------
class UserCredentials(BaseModel):
    email: str
    password: str

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/auth/signup")
async def sign_up(cred: UserCredentials):
    try:
        auth_response = client.auth.sign_up({
            "email": cred.email,
            "password": cred.password
        })
        return {
            "id": auth_response.user.id,
            "email": auth_response.user.email,
            "message": "Registration successful."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
async def login(cred: UserCredentials):
    try:
        auth_response = client.auth.sign_in_with_password({
            "email": cred.email,
            "password": cred.password
        })

        response = JSONResponse({
            "message": "Login successful",
            "user": {
                "id": auth_response.user.id,
                "email": auth_response.user.email
            }
        })

        response.set_cookie(
            key="access_token",
            value=auth_response.session.access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            path="/"
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/logout")
async def logout():
    response = JSONResponse({"message": "Logout successful"})
    response.delete_cookie("access_token", path="/")
    return response

@app.get("/api/auth/me")
async def me(user=Depends(get_current_user)):
    return {
        "user_id": user.get("sub"),
        "email": user.get("email")
    }

# ----------------- CHAT SESSIONS ENDPOINTS -----------------
class ChatCreate(BaseModel):
    title: str

@app.get("/api/chats")
async def get_chats(user=Depends(get_current_user)):
    user_id = user.get("sub")
    try:
        res = client.table("chat_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        print(f"Supabase DB error, falling back to local memory: {e}")
        return get_sessions_fallback(user_id)

@app.post("/api/chats")
async def create_chat(payload: ChatCreate, user=Depends(get_current_user)):
    user_id = user.get("sub")
    try:
        res = client.table("chat_sessions").insert({
            "user_id": user_id,
            "title": payload.title
        }).execute()
        return res.data[0]
    except Exception as e:
        print(f"Supabase DB error, falling back to local memory: {e}")
        return create_session_fallback(user_id, payload.title)

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str, user=Depends(get_current_user)):
    try:
        client.table("chat_sessions").delete().eq("id", chat_id).execute()
        return {"message": "Chat deleted"}
    except Exception as e:
        print(f"Supabase DB error, falling back to local memory: {e}")
        return delete_session_fallback(chat_id)

@app.get("/api/chats/{chat_id}/messages")
async def get_messages(chat_id: str, user=Depends(get_current_user)):
    try:
        res = client.table("messages").select("*").eq("session_id", chat_id).order("created_at", desc=False).execute()
        return res.data
    except Exception as e:
        print(f"Supabase DB error, falling back to local memory: {e}")
        return get_messages_fallback(chat_id)

# ----------------- DOCUMENT MANAGEMENT ENDPOINTS -----------------
@app.get("/api/documents")
async def get_documents(user=Depends(get_current_user)):
    user_id = user.get("sub")
    try:
        res = client.table("documents").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        print(f"Supabase DB error loading documents: {e}")
        return get_documents_fallback(user_id)

@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...), user=Depends(get_current_user)):
    user_id = user.get("sub")
    
    # Save raw file locally
    file_path = os.path.join(config.RAW_DATA_DIR, file.filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    chunk_count = 0
    try:
        # Run document extraction RAG pipeline
        processor = DocumentProcessor(file_path)
        chunks = processor.process_document()
        processor.close()
        
        if chunks:
            chunk_count = len(chunks)
            # Create/Merge index embeddings
            vector_store.create_embeddings(vector_store.chunks + chunks)
            vector_store.save(config.VECTOR_STORE_PATH)
    except Exception as e:
        print(f"Failed to process document chunks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract document content: {str(e)}")

    # Store in Supabase / Fallback
    try:
        res = client.table("documents").insert({
            "user_id": user_id,
            "name": file.filename,
            "chunk_count": chunk_count,
            "file_path": file_path
        }).execute()
        return res.data[0]
    except Exception as e:
        print(f"Supabase DB error storing document: {e}")
        return add_document_fallback(user_id, file.filename, chunk_count, file_path)

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str, user=Depends(get_current_user)):
    # Deleting document from DB
    try:
        client.table("documents").delete().eq("id", document_id).execute()
    except Exception as e:
        print(f"Supabase DB error deleting document: {e}")
        if document_id in IN_MEMORY_DOCUMENTS:
            del IN_MEMORY_DOCUMENTS[document_id]
            
    return {"message": "Document deleted successfully"}

# ----------------- MESSAGE POSTING & RAG QUERY ENDPOINT -----------------
@app.post("/api/chats/{chat_id}/messages")
async def send_message(
    chat_id: str,
    text_content: str = Form(""),
    active_document: Optional[str] = Form(None), # If present, filters chunks by document source
    user=Depends(get_current_user)
):
    user_id = user.get("sub")
    citations = []
    response_text = ""

    # 1. Run RAG over the vector store
    if text_content.strip():
        if vector_store.chunks and len(vector_store.chunks) > 0:
            try:
                # Query index. We retrieve k=25 to ensure plenty of hits before filtering by active document
                search_results = vector_store.search(text_content, k=25)
                
                # Check if the query references a specific page (e.g., "Page 3" or "page 3")
                import re
                page_match = re.search(r'\bpages?\s+(\d+)\b', text_content, re.IGNORECASE)
                target_page = int(page_match.group(1)) if page_match else None
                
                if target_page:
                    # Filter/boost chunks that match target_page to the front
                    page_chunks = [r for r in search_results if r["chunk"].get("page") == target_page]
                    other_chunks = [r for r in search_results if r["chunk"].get("page") != target_page]
                    
                    # If target_page chunks are not in top 25, pull them directly from the vector store chunks registry
                    if not page_chunks:
                        matching_indices = [
                            idx for idx, c in enumerate(vector_store.chunks)
                            if c.get("page") == target_page
                        ]
                        for idx in matching_indices[:5]:
                            page_chunks.append({
                                "chunk": vector_store.chunks[idx],
                                "score": 0.0  # Perfect metadata match
                            })
                    search_results = (page_chunks + other_chunks)[:25]
                
                # Filter results by active document if selected
                if active_document:
                    # Resolve UI active_document name to its actual filename
                    doc_filename = None
                    # Try local memory fallback first for instant lookup, especially for guest sessions
                    user_docs = get_documents_fallback(user_id)
                    for doc in user_docs:
                        if doc["name"] == active_document:
                            doc_filename = os.path.basename(doc["file_path"])
                            break
                    
                    # Hardcoded fallback for the static demo document name mapping
                    if not doc_filename and active_document == "Qatar Economic Report (Demo)":
                        doc_filename = "qatar_test_doc.pdf"
                    
                    if not doc_filename and user_id != "guest":
                        try:
                            res = client.table("documents").select("file_path").eq("user_id", user_id).eq("name", active_document).execute()
                            if res.data:
                                doc_filename = os.path.basename(res.data[0]["file_path"])
                        except Exception as e:
                            print(f"Failed to query document filename from Supabase: {e}")
                    
                    active_filename = doc_filename or active_document
                    
                    filtered_results = []
                    for result in search_results:
                        source_meta = result["chunk"].get("source", "")
                        # Check if the active document filename matches or is contained in the source metadata
                        if active_filename.lower() in source_meta.lower():
                            filtered_results.append(result)
                    
                    search_results = filtered_results[:10]  # Keep top 10
                else:
                    search_results = search_results[:10]    # Keep top 10

                # Answer with citation claims
                result = qa_system.generate_answer_with_citations(text_content, search_results)
                response_text = result.get("answer", "No response generated.")
                citations = result.get("citations", [])
            except Exception as e:
                response_text = f"RAG pipeline encountered an error during generation: {str(e)}"
        else:
            try:
                result = qa_system.generate_answer_with_citations(text_content, [])
                response_text = result.get("answer")
            except Exception:
                response_text = "I'm sorry, the vector store database is currently empty. Please upload documents in the sidebar to populate the index."
    else:
        response_text = "Please enter a question to start chatting."

    # 2. Store messages (User and Assistant) in database/fallback
    stored_messages = []
    
    # Save user message
    if user_id != "guest":
        try:
            user_res = client.table("messages").insert({
                "session_id": chat_id,
                "sender": "user",
                "text_content": text_content
            }).execute()
            stored_messages.append(user_res.data[0])
        except Exception as e:
            print(f"Supabase DB error storing user message: {e}")
            stored_messages.append(add_message_fallback(
                chat_id=chat_id,
                sender="user",
                text_content=text_content
            ))
    else:
        stored_messages.append(add_message_fallback(
            chat_id=chat_id,
            sender="user",
            text_content=text_content
        ))

    # Save assistant response
    if user_id != "guest":
        try:
            assistant_res = client.table("messages").insert({
                "session_id": chat_id,
                "sender": "assistant",
                "text_content": response_text,
                "citations": citations
            }).execute()
            stored_messages.append(assistant_res.data[0])
        except Exception as e:
            print(f"Supabase DB error storing assistant message: {e}")
            stored_messages.append(add_message_fallback(
                chat_id=chat_id,
                sender="assistant",
                text_content=response_text,
                citations=citations
            ))
    else:
        stored_messages.append(add_message_fallback(
            chat_id=chat_id,
            sender="assistant",
            text_content=response_text,
            citations=citations
        ))

    return {"messages": stored_messages}

# ----------------- SYSTEM STATS ENDPOINT -----------------
@app.get("/api/stats")
async def get_stats(user=Depends(get_current_user)):
    chunks = vector_store.chunks if vector_store else []
    total = len(chunks)
    texts = sum(1 for c in chunks if c.get("type") == "text")
    images = sum(1 for c in chunks if c.get("type") == "image")
    
    return {
        "totalChunks": total,
        "textChunks": texts,
        "imageChunks": images
    }

# ----------------- DEMO DOCUMENT ENDPOINT -----------------
DEMO_DOC_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "qatar_test_doc.pdf"))
DEMO_DOC_NAME = "Qatar Economic Report (Demo)"

@app.post("/api/demo-document")
async def load_demo_document(user=Depends(get_current_user)):
    """Load the built-in demo document into the vector store."""
    user_id = user.get("sub")

    if not os.path.exists(DEMO_DOC_PATH):
        raise HTTPException(status_code=404, detail="Demo document not found on server.")

    chunk_count = 0
    try:
        processor = DocumentProcessor(DEMO_DOC_PATH)
        chunks = processor.process_document()
        processor.close()

        if chunks:
            chunk_count = len(chunks)
            vector_store.create_embeddings(vector_store.chunks + chunks)
            vector_store.save(config.VECTOR_STORE_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process demo document: {str(e)}")

    # Store metadata
    try:
        res = client.table("documents").insert({
            "user_id": user_id,
            "name": DEMO_DOC_NAME,
            "chunk_count": chunk_count,
            "file_path": DEMO_DOC_PATH
        }).execute()
        return res.data[0]
    except Exception:
        return add_document_fallback(user_id, DEMO_DOC_NAME, chunk_count, DEMO_DOC_PATH)