from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
import pickle
import os


class VectorStore:

    def __init__(self, model_name="sentence-transformers/all-MiniLM-L6-v2"):
        print(f"Loading embedding model: {model_name}")

        self.embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )

        self.vectorstore = None
        self.chunks = []

        print("Embedding model loaded")

    def create_embeddings(self, chunks):
        self.chunks = chunks
        documents = []

        for i, chunk in enumerate(chunks):
            doc = Document(
                page_content=chunk["content"],
                metadata={
                    "page": chunk["page"],
                    "type": chunk["type"],
                    "source": chunk["source"],
                    "chunk_id": i
                }
            )
            documents.append(doc)

        print("Building FAISS index")

        self.vectorstore = FAISS.from_documents(
            documents=documents,
            embedding=self.embeddings
        )

        print(f"FAISS index created with {len(documents)} vectors")

    def search(self, query, k=5, score_threshold=2.0):
        if self.vectorstore is None:
            return []

        results = self.vectorstore.similarity_search_with_score(query, k=k)

        formatted_results = []
        for idx, (doc, score) in enumerate(results):
            if score > score_threshold:
                continue

            formatted_results.append({
                "chunk": {
                    "content": doc.page_content,
                    "page": doc.metadata["page"],
                    "type": doc.metadata["type"],
                    "source": doc.metadata["source"]
                },
                "score": float(score),
                "rank": idx + 1
            })

        return formatted_results

    def save(self, file_path):
        if self.vectorstore is None:
            print("No vector store to save")
            return

        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        self.vectorstore.save_local(file_path)

        with open(f"{file_path}_chunks.pkl", "wb") as f:
            pickle.dump(self.chunks, f)

        print("Vector store saved")

    def load(self, file_path):
        self.vectorstore = FAISS.load_local(
            file_path,
            self.embeddings,
            allow_dangerous_deserialization=True
        )

        with open(f"{file_path}_chunks.pkl", "rb") as f:
            self.chunks = pickle.load(f)

        print("Vector store loaded")


if __name__ == "__main__":
    test_chunks = [
        {'content': 'Qatar has strong economic growth', 'page': 1, 'type': 'text', 'source': 'Page 1'},
        {'content': 'Banking sector remains healthy', 'page': 2, 'type': 'text', 'source': 'Page 2'},
        {'content': 'IMF recommendations for fiscal policy', 'page': 3, 'type': 'text', 'source': 'Page 3'}
    ]
    
    print("Testing LangChain Vector Store...")
    store = VectorStore()
    store.create_embeddings(test_chunks)
    
    results = store.search("What is Qatar's economic situation?", k=2)
    print(f"\nSearch Results:")
    for result in results:
        print(f"Rank {result['rank']}: {result['chunk']['content'][:50]}... (Score: {result['score']:.3f})")