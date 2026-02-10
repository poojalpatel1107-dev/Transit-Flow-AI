import os
import json
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError
from PyPDF2 import PdfReader


class JanmargBrain:
    def __init__(self, pdf_path=None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        default_pdf = os.path.join(base_dir, "data", "World_Bank_GEF.pdf")
        self.pdf_path = pdf_path or os.getenv("JANMARG_PDF_PATH", default_pdf)
        self.official_context = self._build_official_context()

    def _fare_table_context(self):
        return (
            "FARE TABLE (distance_km -> fare_inr): "
            "<3=5, 3-5=10, 5-8=15, 8-14=20, 14-20=25, >20=30."
        )

    def _estimate_fare(self, distance_km):
        if distance_km is None:
            return None
        try:
            km = float(distance_km)
        except (TypeError, ValueError):
            return None
        if km < 3:
            return 5
        if km < 5:
            return 10
        if km < 8:
            return 15
        if km < 14:
            return 20
        if km < 20:
            return 25
        return 30

    def _is_fare_question(self, query):
        q = query.lower()
        return any(word in q for word in ("fare", "ticket", "price", "cost"))

    def _extract_distance_from_context(self, context):
        if not context:
            return None
        marker = "distance_km="
        if marker not in context:
            return None
        try:
            value = context.split(marker, 1)[1].split(",", 1)[0]
            return float(value)
        except (ValueError, TypeError):
            return None

    def _read_pdf_text(self):
        if not self.pdf_path or not os.path.exists(self.pdf_path):
            return ""
        try:
            # Add a small timeout-like protection by only reading first few pages if it's huge
            # and wrapping in a very broad try-except
            reader = PdfReader(self.pdf_path)
            pages_text = []
            max_pages = min(len(reader.pages), 10) # Limit to 10 pages for speed
            for i in range(max_pages):
                try:
                    page = reader.pages[i]
                    text = page.extract_text() or ""
                    if text.strip():
                        pages_text.append(text)
                except Exception:
                    continue
            return "\n".join(pages_text)
        except Exception as e:
            print(f"Warning: Could not read PDF {self.pdf_path}: {e}")
            return ""

    def _extract_key_sentences(self, text):
        if not text:
            return ""
        keywords = [
            "commercial speed",
            "headway",
            "frequency",
            "station cost",
            "operating cost",
            "peak hour",
            "peak hours",
            "dwell time",
            "fare"
        ]
        candidates = []
        for line in text.splitlines():
            clean = " ".join(line.strip().split())
            if not clean:
                continue
            lower = clean.lower()
            if any(key in lower for key in keywords):
                candidates.append(clean)
        return "\n".join(candidates[:120])

    def _build_official_context(self):
        raw_text = self._read_pdf_text()
        extracted = self._extract_key_sentences(raw_text)
        if extracted:
            return f"{extracted}\n{self._fare_table_context()}"
        return (
            "Official context could not be loaded from the PDF. "
            "Please ensure World_Bank_GEF.pdf is available. "
            f"{self._fare_table_context()}"
        )

    def _fallback_answer(self, query, user_context=None):
        if self._is_fare_question(query):
            context_str = user_context or ""
            distance_km = self._extract_distance_from_context(context_str)
            
            # If we don't have distance but have origin/dest, we should have distance in context string
            # if server.py calculated it correctly. Let's make sure we try our best.
            fare = self._estimate_fare(distance_km)
            
            if fare is not None:
                return (
                    f"The estimated fare for your journey is Rs {fare} (approx {distance_km:.1f} km). "
                    "Janmarg fare bands: 1-3km=Rs 5, 3-5km=Rs 10, 5-8km=Rs 15, 8-14km=Rs 20, 14-20km=Rs 25, >20km=Rs 30."
                )
            
            return (
                "Based on Janmarg's official fare policy, tickets start at Rs 5 (up to 3km) "
                "and go up to Rs 30 (for journeys over 20km). "
                "To get exact pricing, please select your origin and destination in the search bar."
            )

        return (
            "I am the Janmarg AI. I can help you with fares, route guidance, and operating hours. "
            "Try asking: 'What is the fare from ISKCON to VGEC?' or 'How do I go from LD to Airport?'"
        )


    def ask_llama(self, user_query, user_context=None, history=None):
        query = (user_query or "").strip()
        if not query:
            return "Please provide a question about Janmarg BRTS operations."

        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            fallback = self._fallback_answer(query, user_context=user_context)
            return "LLM unavailable (missing GROQ_API_KEY). " + fallback

        context_block = ""
        if user_context:
            context_block = f"\nUSER CONTEXT (not authoritative): {user_context}"

        system_prompt = (
            "You are the Janmarg AI Assistant. Answer the user's question strictly "
            "using the following context from the World Bank GEF Report. "
            f"CONTEXT: {self.official_context} "
            f"{context_block} "
            "If the answer is not in the text, say "
            "\"I can only answer based on official BRTS protocols.\""
        )

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        if history:
            for item in history[-6:]:
                role = item.get("role")
                content = item.get("content")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": str(content)})

        messages.append({"role": "user", "content": query})

        payload = {
            "model": os.getenv("GROQ_MODEL", "llama3-70b-8192"),
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 500
        }

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib_request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
            )
            with urllib_request.urlopen(req, timeout=20) as resp:
                result = json.loads(resp.read().decode("utf-8"))
        except HTTPError as err:
            try:
                body = err.read().decode("utf-8")
                error_payload = json.loads(body)
                message = error_payload.get("error", {}).get("message")
                if message:
                    return message
                if body.strip():
                    return body.strip()[:300]
            except (ValueError, KeyError, TypeError):
                pass
            return self._fallback_answer(query, user_context=user_context)
        except URLError:
            return self._fallback_answer(query, user_context=user_context)
        except (ValueError, KeyError, TypeError):
            return self._fallback_answer(query, user_context=user_context)

        if not isinstance(result, dict):
            return self._fallback_answer(query, user_context=user_context)

        if result.get("error"):
            return self._fallback_answer(query, user_context=user_context)

        choices = result.get("choices", [])
        if not choices:
            return self._fallback_answer(query, user_context=user_context)

        message = choices[0].get("message") or choices[0].get("delta") or {}
        content = message.get("content")
        if not content:
            content = choices[0].get("text")
        if not content:
            return self._fallback_answer(query, user_context=user_context)

        return str(content).strip()
