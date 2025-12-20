def load_css():
    st.markdown(
        """
        <style>
        /* ----------- GLOBAL ----------- */
        html, body, [class*="css"] {
            font-family: 'Inter', sans-serif;
        }

        body {
            background: linear-gradient(135deg, #0f172a, #020617);
        }

        /* ----------- ANIMATIONS ----------- */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from { transform: translateY(12px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* ----------- HEADER ----------- */
        .app-title {
            font-size: 2.4rem;
            font-weight: 700;
            background: linear-gradient(90deg, #22d3ee, #38bdf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: fadeIn 0.8s ease-in-out;
            text-align: center;
        }

        .subtitle {
            color: #94a3b8;
            text-align: center;
            margin-bottom: 2rem;
            animation: fadeIn 1.2s ease-in-out;
        }

        /* ----------- SIDEBAR CARD ----------- */
        .status-card {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
            backdrop-filter: blur(10px);
            animation: slideUp 0.6s ease-in-out;
        }

        /* ----------- CHAT ----------- */
        .chat-bubble {
            background: rgba(255,255,255,0.06);
            border-radius: 14px;
            padding: 14px 16px;
            margin-bottom: 10px;
            animation: slideUp 0.4s ease-in-out;
        }

        .assistant {
            border-left: 3px solid #38bdf8;
        }

        .user {
            border-left: 3px solid #22d3ee;
        }

        /* ----------- CITATIONS ----------- */
        .citation {
            font-size: 0.85rem;
            color: #cbd5f5;
            padding: 6px 0;
        }

        </style>
        """,
        unsafe_allow_html=True
    )
import streamlit as st
import os
from vector_store import VectorStore
from llm_qa import LLMQA, SimpleQA
import config

st.set_page_config(
    page_title="Qatar IMF RAG",
    layout="wide",
    initial_sidebar_state="expanded"
)

load_css()

# ---------------- SESSION ----------------
if "vector_store" not in st.session_state:
    st.session_state.vector_store = None
if "qa_system" not in st.session_state:
    st.session_state.qa_system = None
if "loaded" not in st.session_state:
    st.session_state.loaded = False
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# ---------------- LOAD ----------------
if not st.session_state.loaded:
    try:
        vector_store = VectorStore(model_name=config.EMBEDDING_MODEL)
        vector_store.load(config.VECTOR_STORE_PATH)
        st.session_state.vector_store = vector_store

        try:
            st.session_state.qa_system = LLMQA(model_name=config.LLM_MODEL)
        except Exception:
            st.session_state.qa_system = SimpleQA()

        st.session_state.loaded = True
    except Exception:
        pass

# ---------------- HEADER ----------------
st.markdown(
    """
    <div class="app-title">Retrieval-Augmented Document Intelligence</div>
    <div class="subtitle">
        Grounded question answering over structured text, tables, and OCR data
    </div>
    """,
    unsafe_allow_html=True
)


# ---------------- SIDEBAR ----------------
with st.sidebar:
    st.markdown("<div class='status-card'>", unsafe_allow_html=True)
    st.subheader("System Status")

    if st.session_state.loaded:
        st.success("Vector store loaded")

        chunks = st.session_state.vector_store.chunks
        st.metric("Total Chunks", len(chunks))
        st.metric("Text Chunks", sum(1 for c in chunks if c["type"] == "text"))
        st.metric("Image Chunks", sum(1 for c in chunks if c["type"] == "image"))

        if st.button("Clear chat"):
            st.session_state.chat_history = []
            st.rerun()
    else:
        st.error("Data not loaded")

    st.markdown("</div>", unsafe_allow_html=True)

# ---------------- CHAT ----------------
if st.session_state.loaded:
    for msg in st.session_state.chat_history:
        role_class = "assistant" if msg["role"] == "assistant" else "user"
        st.markdown(
            f"<div class='chat-bubble {role_class}'>{msg['content']}</div>",
            unsafe_allow_html=True
        )

        if "citations" in msg:
            with st.expander("Sources"):
                for cite in msg["citations"]:
                    st.markdown(
                        f"<div class='citation'>{cite['source']} | score {cite['relevance_score']:.3f}</div>",
                        unsafe_allow_html=True
                    )

    query = st.chat_input("Ask something about the IMF report")

    if query:
        st.session_state.chat_history.append({"role": "user", "content": query})

        search_results = st.session_state.vector_store.search(query, k=5)
        result = st.session_state.qa_system.generate_answer_with_citations(query, search_results)

        st.session_state.chat_history.append({
            "role": "assistant",
            "content": result["answer"],
            "citations": result["citations"]
        })

        st.rerun()
