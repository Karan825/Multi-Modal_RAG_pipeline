import os
import json
from vector_store import VectorStore
import config


def main():
    print("STEP 2: Creating Embeddings\n")

    if not os.path.exists(config.CHUNKS_PATH):
        print("Error: Processed data not found")
        return

    print("Processed data found")

    with open(config.CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"Loaded {len(chunks)} chunks")

    text_count = sum(1 for c in chunks if c["type"] == "text")
    image_count = sum(1 for c in chunks if c["type"] == "image")

    print(f"Text chunks: {text_count}")
    print(f"Images: {image_count}")

    vector_store = VectorStore(model_name=config.EMBEDDING_MODEL)
    vector_store.create_embeddings(chunks)

    vector_store.save(config.VECTOR_STORE_PATH)

    print("Embedding creation completed")
    print(f"Total vectors stored: {len(chunks)}")


if __name__ == "__main__":
    main()
