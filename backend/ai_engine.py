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
            reader = PdfReader(self.pdf_path)
            pages_text = []
            for page in reader.pages:
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(text)
            return "\n".join(pages_text)
        except Exception:
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
            distance_km = self._extract_distance_from_context(user_context or "")
            fare = self._estimate_fare(distance_km)
            if fare is not None:
                return (
                    f"Estimated fare: Rs {fare} for about {distance_km:.1f} km. "
                    "Fare bands: <3=5, 3-5=10, 5-8=15, 8-14=20, 14-20=25, >20=30."
                )

        text = self.official_context or ""
        if not text:
            return "I can only answer based on official BRTS protocols."

        keywords = []
        q = query.lower()
        if "fare" in q or "ticket" in q or "price" in q:
            keywords.append("fare")
        if "headway" in q or "frequency" in q or "interval" in q:
            keywords.extend(["headway", "frequency"])
        if "speed" in q or "commercial" in q:
            keywords.append("commercial speed")
        if "peak" in q:
            keywords.append("peak")
        if "dwell" in q:
            keywords.append("dwell")
        if "station" in q and "cost" in q:
            keywords.append("station cost")

        if not keywords:
            keywords = ["commercial speed", "headway", "peak", "fare"]

        lines = [" ".join(line.split()) for line in text.splitlines() if line.strip()]
        matches = []
        for line in lines:
            lower = line.lower()
            if any(k in lower for k in keywords):
                matches.append(line)
        if matches:
            return "\n".join(matches[:6])

        return "I can only answer based on official BRTS protocols."

    def ask_llama(self, user_query, user_context=None, history=None):
        query = (user_query or "").strip()
        if not query:
            return "Please provide a question about Janmarg BRTS operations."

        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            return self._fallback_answer(query, user_context=user_context)

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
