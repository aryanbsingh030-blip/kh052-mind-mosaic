"""
Mock AI providers for testing and development.

Uses keyword extraction and TF-IDF cosine similarity instead of real ML models.
This allows the application to run without any heavy ML dependencies.
"""

import math
import re
from collections import Counter

from ai.providers.base import LLMProvider, EmbeddingProvider, ExtractedSkill


# --- Skill Taxonomy for Mock Extraction ---
SKILL_TAXONOMY = {
    "Programming Languages": [
        "python", "javascript", "typescript", "java", "c++", "c#", "c",
        "rust", "go", "ruby", "php", "swift", "kotlin", "r", "matlab",
        "scala", "dart", "lua", "perl", "html", "css", "sql",
    ],
    "Web Development": [
        "react", "angular", "vue", "next.js", "node.js", "express",
        "django", "flask", "fastapi", "spring boot", "rails",
        "tailwind", "bootstrap", "graphql", "rest api", "webpack",
    ],
    "Data Science": [
        "machine learning", "deep learning", "data analysis",
        "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch",
        "data visualization", "statistics", "jupyter", "tableau",
        "natural language processing", "nlp", "computer vision",
    ],
    "Databases": [
        "postgresql", "mysql", "mongodb", "redis", "sqlite",
        "elasticsearch", "firebase", "dynamodb", "cassandra",
    ],
    "DevOps & Cloud": [
        "docker", "kubernetes", "aws", "azure", "gcp", "ci/cd",
        "terraform", "ansible", "linux", "git", "github actions",
    ],
    "Mobile Development": [
        "react native", "flutter", "ios", "android",
        "swiftui", "jetpack compose",
    ],
    "Design": [
        "ui design", "ux design", "figma", "adobe xd", "photoshop",
        "illustrator", "prototyping", "wireframing", "user research",
    ],
    "Soft Skills": [
        "leadership", "communication", "teamwork", "problem solving",
        "project management", "agile", "scrum", "public speaking",
        "critical thinking", "time management",
    ],
}

# Flatten for quick lookup
SKILL_TO_CATEGORY = {}
for category, skills in SKILL_TAXONOMY.items():
    for skill in skills:
        SKILL_TO_CATEGORY[skill] = category


def _tokenize(text: str) -> list[str]:
    """Simple tokenizer that preserves multi-word skills."""
    text = text.lower().strip()
    return re.findall(r'\b[a-z][a-z0-9+#.]*(?:\s+[a-z][a-z0-9+#.]*)*\b', text)


def _extract_ngrams(text: str, max_n: int = 3) -> list[str]:
    """Extract word n-grams from text."""
    words = text.lower().split()
    ngrams = []
    for n in range(1, min(max_n + 1, len(words) + 1)):
        for i in range(len(words) - n + 1):
            ngrams.append(" ".join(words[i:i + n]))
    return ngrams


class MockLLMProvider(LLMProvider):
    """
    Mock LLM provider using keyword matching.

    Good enough for testing and demos. No ML dependencies required.
    """

    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate a mock response."""
        return f"[Mock LLM] Processed prompt of {len(prompt)} characters."

    async def extract_skills(self, text: str) -> list[ExtractedSkill]:
        """
        Extract skills using keyword matching against the skill taxonomy.

        Looks for known skill names in the text, detects proficiency hints,
        and assigns confidence scores based on match quality.
        """
        text_lower = text.lower()
        ngrams = _extract_ngrams(text_lower, max_n=3)
        found_skills: list[ExtractedSkill] = []
        seen = set()

        for ngram in ngrams:
            if ngram in SKILL_TO_CATEGORY and ngram not in seen:
                seen.add(ngram)

                # Detect proficiency hints
                proficiency = self._detect_proficiency(text_lower, ngram)

                found_skills.append(ExtractedSkill(
                    skill_name=ngram.title() if len(ngram) > 3 else ngram.upper(),
                    skill_category=SKILL_TO_CATEGORY[ngram],
                    proficiency="INTERMEDIATE" if proficiency == 3 else ("ADVANCED" if proficiency > 3 else "BEGINNER"),
                    confidence=0.85,
                    evidence=text[max(0, text_lower.find(ngram) - 30):min(len(text), text_lower.find(ngram) + len(ngram) + 30)],
                    source="direct_mention",
                ))

        return found_skills

    def _detect_proficiency(self, text: str, skill: str) -> int:
        """Estimate proficiency level from context words near the skill mention."""
        # Find the skill position
        idx = text.find(skill)
        if idx == -1:
            return 3  # Default mid-level

        # Look at surrounding context (50 chars each side)
        context = text[max(0, idx - 50):idx + len(skill) + 50]

        expert_words = ["expert", "advanced", "proficient", "extensive", "years of"]
        intermediate_words = ["intermediate", "familiar", "comfortable", "good at", "know"]
        beginner_words = ["beginner", "learning", "want to learn", "basic", "new to", "starting"]

        for word in expert_words:
            if word in context:
                return 5
        for word in intermediate_words:
            if word in context:
                return 3
        for word in beginner_words:
            if word in context:
                return 1

        return 3  # Default


class MockEmbeddingProvider(EmbeddingProvider):
    """
    Mock embedding provider using TF-IDF vectors.

    Provides reasonable semantic similarity without ML model dependencies.
    """

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Generate TF-IDF-like embeddings.

        Uses term frequency as a simple embedding — not true embeddings,
        but sufficient for mock matching.
        """
        # Build vocabulary from all texts
        all_words: set[str] = set()
        tokenized_texts = []
        for text in texts:
            tokens = text.lower().split()
            tokenized_texts.append(tokens)
            all_words.update(tokens)

        vocab = sorted(all_words)
        word_to_idx = {w: i for i, w in enumerate(vocab)}

        # Create TF vectors
        embeddings = []
        for tokens in tokenized_texts:
            vec = [0.0] * len(vocab)
            counts = Counter(tokens)
            for word, count in counts.items():
                if word in word_to_idx:
                    vec[word_to_idx[word]] = count / len(tokens)
            embeddings.append(vec)

        return embeddings

    async def similarity(self, text_a: str, text_b: str) -> float:
        """Compute cosine similarity between two texts."""
        embeddings = await self.embed([text_a, text_b])
        return self._cosine_similarity(embeddings[0], embeddings[1])

    @staticmethod
    def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot / (norm_a * norm_b)
