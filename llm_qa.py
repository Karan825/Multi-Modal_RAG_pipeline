from typing import List
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()


class LLMQA:

    def __init__(self, model_name="llama-3.1-8b-instant"):
        print(f"Loading LLM model via LangChain: {model_name}")

        try:
            self.llm = ChatGroq(
                model=model_name,
                temperature=0.0
            )

            self.prompt_template = """You are a question-answering assistant.
            Based ONLY on the context below, answer the user's question or summarize the information about their query/keyword.
            If the context does not contain any relevant information about the query, you must say:
            "I cannot find this information in the document."

            Context:
            {context}

            Question/Query:
            {question}

            Answer:"""

            print("Groq LLM loaded successfully")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise

    def generate_answer(self, query, context_chunk):
        # Deduplicate chunks by content to avoid duplicate prompt tokens
        seen = set()
        unique_chunks = []
        for chunk in context_chunk:
            content_hash = chunk['content'].strip()
            if content_hash not in seen:
                seen.add(content_hash)
                unique_chunks.append(chunk)

        # Build context up to top 3 unique chunks or a maximum of 12,000 characters (~3,000 tokens)
        context_parts = []
        total_chars = 0
        for chunk in unique_chunks[:3]:
            part = f"[Source: {chunk['source']}]\n{chunk['content']}"
            if total_chars + len(part) > 12000:
                remaining_chars = 12000 - total_chars
                if remaining_chars > 200:
                    context_parts.append(part[:remaining_chars] + "\n[... truncated to fit token limits ...]")
                break
            context_parts.append(part)
            total_chars += len(part)

        context_text = "\n\n".join(context_parts)

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
        seen_citations = set()
        rank = 1
        for result in search_results:
            chunk = result['chunk']
            cite_key = (chunk['source'], chunk['page'])
            if cite_key not in seen_citations:
                seen_citations.add(cite_key)
                citations.append({
                    'rank': rank,
                    'source': chunk['source'],
                    'page': chunk['page'],
                    'type': chunk['type'],
                    'relevance_score': result['score']
                })
                rank += 1
                if len(citations) >= 5:
                    break

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