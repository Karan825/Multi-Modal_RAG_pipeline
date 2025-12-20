from typing import List
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import torch

load_dotenv()


class LLMQA:

    def __init__(self, model_name="llama-3.1-8b-instant"):
        print(f"Loading LLM model via LangChain: {model_name}")

        device = 0 if torch.cuda.is_available() else -1
        device_name = 'GPU' if device == 0 else 'CPU'

        try:
            self.llm = ChatGroq(
                model=model_name,
                temperature=0.7
            )

            self.prompt_template = """You are a question-answering assistant.
            Answer the question using ONLY the context below.
            If the answer is not present, say:
            "I cannot find this information in the document."
            Context:
            {context}

            Question:
            {question}

            Answer:"""

            print("Groq LLM loaded successfully")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise

    def generate_answer(self, query, context_chunk):

        context_text = "\n\n".join([
            f"[Source: {chunk['source']}]\n{chunk['content'][:]}"
            for chunk in context_chunk[:3]
        ])

        print("\n----- CONTEXT SENT TO LLM -----")
        print(context_text)
        print("----- END CONTEXT -----\n")

        prompt = self.prompt_template.format(
            context=context_text,
            question=query
        )
        try:
            result = self.llm.invoke(prompt)
            answer = result.content.strip()
        except Exception as e:
            print(f"Error generating answer: {e}")
            answer = "Sorry, I encountered an error generating the answer."

        return answer

    def generate_answer_with_citations(self, query, search_results):

        context_chunks = [result['chunk'] for result in search_results]

        answer = self.generate_answer(query, context_chunks)

        citations = []
        for i, result in enumerate(search_results[:3]):
            chunk = result['chunk']
            citations.append({
                'rank': i + 1,
                'source': chunk['source'],
                'page': chunk['page'],
                'type': chunk['type'],
                'relevance_score': result['score']
            })

        return {
            'answer': answer,
            'citations': citations,
            'context_used': len(context_chunks)
        }


class SimpleQA:
    def __init__(self):
        print()

    def generate_answer_with_citations(self, query, search_results):
        if not search_results:
            return {
                'answer': "No relevant information found in the document.",
                'citations': [],
                'context_used': 0
            }
        top_chunks = search_results[:3]

        answer_parts = []
        for result in top_chunks:
            chunk = result['chunk']
            snippet = chunk['content'][:200].strip()
            if snippet:
                answer_parts.append(f"From {chunk['source']}: {snippet}...")

        answer = "\n\n".join(answer_parts) if answer_parts else "No relevant information found."

        citations = []
        for i, result in enumerate(top_chunks):
            chunk = result['chunk']
            citations.append({
                'rank': i + 1,
                'source': chunk['source'],
                'page': chunk['page'],
                'type': chunk['type'],
                'relevance_score': result['score']
            })

        return {
            'answer': answer,
            'citations': citations,
            'context_used': len(search_results)
        }


if __name__ == "__main__":

    test_results = [
        {
            'chunk': {
                'content': 'Qatar economy grew by 5% in 2024 driven by strong non-hydrocarbon sector growth.',
                'page': 1,
                'type': 'text',
                'source': 'Page 1'
            },
            'score': 0.85
        },
        {
            'chunk': {
                'content': 'The banking sector remains healthy with strong capital ratios.',
                'page': 2,
                'type': 'text',
                'source': 'Page 2'
            },
            'score': 0.72
        }
    ]
    try:
        print("\n1. Test ")
        qa = LLMQA()
        result = qa.generate_answer_with_citations("What is Qatar's growth?", test_results)
        print(f"\nAnswer: {result['answer']}")
        print(f"Citations: {len(result['citations'])} sources")

    except Exception as e:
        print(f"\nLangChain LLMQA failed: {e}")
        print("\n2. Test Fallback ")
        qa = SimpleQA()
        result = qa.generate_answer_with_citations("What is Qatar's growth?", test_results)
        print(f"\nAnswer: {result['answer']}")
        print(f"Citations: {len(result['citations'])} sources")