import os
import io
import json
import base64
import time
import fitz
from PIL import Image
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_text_splitters import RecursiveCharacterTextSplitter
import config

load_dotenv()
# Fallback for when running from the root workspace directory
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env"))

try:
    import pytesseract
    # Check if tesseract binary is actually available in the system PATH
    try:
        pytesseract.get_tesseract_version()
        TESSERACT_AVAILABLE = True
    except Exception:
        TESSERACT_AVAILABLE = False
        print("[WARN] Tesseract binary not found in PATH. OCR functionality will be disabled.")
except ImportError:
    TESSERACT_AVAILABLE = False
    print("[WARN] pytesseract library not installed. OCR functionality will be disabled.")


class DocumentProcessor:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        self.vision_llm = None  # Disabled: Groq Vision models have been decommissioned on this tier

    def extract_text_chunks(self):
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        chunks = []
        filename = os.path.basename(self.pdf_path)
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            
            # 1. Extract regular text
            text = page.get_text()
            
            # 2. Extract structured tables as markdown
            table_markdowns = []
            try:
                tables = page.find_tables()
                for t in tables.tables:
                    markdown_table = t.to_markdown()
                    if markdown_table.strip():
                        table_markdowns.append(markdown_table)
            except Exception as e:
                print(f"Table extraction failed on page {page_num + 1}: {e}")
            
            # Combine text and table markdown representation
            combined_text = text
            if table_markdowns:
                combined_text += "\n\n### Extracted Tables:\n" + "\n\n".join(table_markdowns)
                
            if combined_text.strip():
                # Split page text into smaller chunks
                page_chunks = text_splitter.split_text(combined_text)
                for chunk_idx, chunk_text in enumerate(page_chunks):
                    chunks.append({
                        "type": "text",
                        "content": chunk_text,
                        "page": page_num + 1,
                        "source": f"{filename} (Page {page_num + 1}, Chunk {chunk_idx + 1})"
                    })
        return chunks

    def extract_images_with_ocr(self):
        os.makedirs(config.IMAGES_DIR, exist_ok=True)
        images_data = []
        filename = os.path.basename(self.pdf_path)

        if not TESSERACT_AVAILABLE and not self.vision_llm:
            print("[INFO] OCR and Vision APIs are not available. Skipping image text extraction.")
            return []

        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            for img_idx, img in enumerate(page.get_images()):
                xref = img[0]
                base_img = self.doc.extract_image(xref)
                image_bytes = base_img["image"]

                image_path = os.path.join(
                    config.IMAGES_DIR,
                    f"page{page_num+1}_img{img_idx+1}.png"
                )

                with open(image_path, "wb") as f:
                    f.write(image_bytes)

                try:
                    img_pil = Image.open(io.BytesIO(image_bytes))
                    ocr_text = ""
                    
                    if TESSERACT_AVAILABLE:
                        ocr_text = pytesseract.image_to_string(img_pil).strip()
                    
                    if not ocr_text and self.vision_llm:
                        print(f"Describing image on Page {page_num+1} using Groq Vision LLM...")
                        time.sleep(2.0)  # Rate limiting safety sleep
                        base64_image = base64.b64encode(image_bytes).decode('utf-8')
                        mime_type = base_img.get("ext", "png")
                        if mime_type == "jpx":
                            mime_type = "jpeg"
                        
                        message = [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": "Describe this image/chart/table in detail. Extract any numbers, data points, or text visible in the image. Format tables cleanly as markdown tables if present."},
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/{mime_type};base64,{base64_image}"
                                        }
                                    }
                                ]
                            }
                        ]
                        response = self.vision_llm.invoke(message)
                        ocr_text = response.content.strip()

                    if ocr_text.strip():
                        images_data.append({
                            "type": "image",
                            "content": ocr_text,
                            "page": page_num + 1,
                            "image_path": image_path,
                            "source": f"{filename} (Image/Chart on Page {page_num + 1})"
                        })
                except Exception as e:
                    print(f"Image analysis failed on page {page_num + 1}: {e}")

        return images_data

    def process_document(self):
        print(f"Processing: {self.pdf_path}")

        text_chunks = self.extract_text_chunks()
        images = self.extract_images_with_ocr()

        all_chunks = text_chunks + images
        print(f"Total chunks extracted: {len(all_chunks)}")

        os.makedirs(config.PROCESSED_DATA_DIR, exist_ok=True)
        with open(config.CHUNKS_PATH, "w") as f:
            json.dump(all_chunks, f, indent=2)

        print(f"Saved chunks to {config.CHUNKS_PATH}")
        return all_chunks

    def close(self):
        self.doc.close()


if __name__ == "__main__":
    processor = DocumentProcessor(config.PDF_PATH)
    chunks = processor.process_document()
    print("Sample chunk:", chunks[0])
    processor.close()
