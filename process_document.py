import os
import json
from document_processor import DocumentProcessor
import config


def main():
    print("=" * 70)
    print("STEP 1: Document Processing")
    print("=" * 70)

    # Ensure directories exist
    os.makedirs(config.PROCESSED_DATA_DIR, exist_ok=True)
    os.makedirs(config.IMAGES_DIR, exist_ok=True)

    # Check PDF
    if not os.path.exists(config.PDF_PATH):
        print(f"\nERROR: PDF not found at {config.PDF_PATH}")
        return

    print(f"\nFound PDF: {config.PDF_PATH}")

    # Process document
    processor = DocumentProcessor(config.PDF_PATH)
    chunks = processor.process_document()
    processor.close()

    if not chunks:
        print("\nNo chunks were extracted.")
        return

    print(f"\nExtracted {len(chunks)} total chunks")

    # Stats
    text_count = sum(1 for c in chunks if c["type"] == "text")
    image_count = sum(1 for c in chunks if c["type"] == "image")

    print(f"  - Text chunks: {text_count}")
    print(f"  - Images (OCR): {image_count}")

    print(f"\nProcessed data saved to:")
    print(f"   {config.CHUNKS_PATH}")


if __name__ == "__main__":
    main()
