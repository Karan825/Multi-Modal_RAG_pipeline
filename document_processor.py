import os
import io
import json
import fitz
import pytesseract
from PIL import Image
import config


class DocumentProcessor:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)

    def extract_text_chunks(self):
        chunks = []
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            text = page.get_text()
            if text.strip():
                chunks.append({
                    "type": "text",
                    "content": text,
                    "page": page_num + 1,
                    "source": f"Page {page_num + 1}"
                })
        return chunks

    def extract_images_with_ocr(self):
        os.makedirs(config.IMAGES_DIR, exist_ok=True)
        images_data = []

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
                    ocr_text = pytesseract.image_to_string(img_pil)
                    if ocr_text.strip():
                        images_data.append({
                            "type": "image",
                            "content": ocr_text,
                            "page": page_num + 1,
                            "image_path": image_path,
                            "source": f"Image on Page {page_num + 1}"
                        })
                except Exception as e:
                    print(f"OCR failed on page {page_num + 1}: {e}")

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
