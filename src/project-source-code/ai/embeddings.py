"""
Semantic Vector Embeddings Providers

Supports:
1. SentenceTransformerEmbeddingProvider (uses sentence-transformers if installed & loaded)
2. TFIDFEmbeddingProvider (deterministic offline TF-IDF cosine similarity)
3. HybridSemanticEmbeddingProvider (orchestrates primary with seamless fallback)
"""

import math
from typing import List, Optional
from collections import Counter

from ai.providers.base import EmbeddingProvider

# Check if sentence-transformers is available
try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False


class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    """
    Dense semantic embeddings using Sentence Transformers (e.g., all-MiniLM-L6-v2).
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model: Optional[Any] = None

    @property
    def name(self) -> str:
        return "sentence_transformers"

    async def is_available(self) -> bool:
        """Check if sentence-transformers is installed and model can be loaded."""
        if not HAS_SENTENCE_TRANSFORMERS:
            return False
        if self._model is not None:
            return True
        try:
            self._model = SentenceTransformer(self.model_name)
            return True
        except Exception:
            return False

    async def embed(self, texts: List[str]) -> List[List[float]]:
        if not await self.is_available() or self._model is None:
            raise RuntimeError("SentenceTransformer model is unavailable.")
        embeddings = self._model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()

    async def similarity(self, text_a: str, text_b: str) -> float:
        embeddings = await self.embed([text_a, text_b])
        vec_a, vec_b = embeddings[0], embeddings[1]
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class TFIDFEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic TF-IDF embedding provider using pure Python / standard math.
    Zero external ML or network dependencies.
    """

    @property
    def name(self) -> str:
        return "tfidf_fallback"

    async def is_available(self) -> bool:
        return True

    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate term-frequency vectors across the input vocabulary."""
        tokenized = [t.lower().split() for t in texts]
        vocab = sorted(list(set(w for tokens in tokenized for w in tokens)))
        if not vocab:
            return [[0.0] for _ in texts]

        word_to_idx = {w: i for i, w in enumerate(vocab)}
        vectors = []
        for tokens in tokenized:
            vec = [0.0] * len(vocab)
            counts = Counter(tokens)
            total = max(1, len(tokens))
            for word, count in counts.items():
                if word in word_to_idx:
                    vec[word_to_idx[word]] = count / total
            vectors.append(vec)
        return vectors

    async def similarity(self, text_a: str, text_b: str) -> float:
        """Compute cosine similarity score between two texts."""
        if not text_a.strip() or not text_b.strip():
            return 0.0
        vecs = await self.embed([text_a, text_b])
        vec_a, vec_b = vecs[0], vecs[1]
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class HybridSemanticEmbeddingProvider(EmbeddingProvider):
    """
    Primary Sentence Transformers with transparent fallback to TF-IDF.
    """

    def __init__(self):
        self.primary = SentenceTransformerEmbeddingProvider()
        self.fallback = TFIDFEmbeddingProvider()

    @property
    def name(self) -> str:
        return "hybrid_semantic"

    async def is_available(self) -> bool:
        return True

    async def embed(self, texts: List[str]) -> List[List[float]]:
        if await self.primary.is_available():
            try:
                return await self.primary.embed(texts)
            except Exception:
                pass
        return await self.fallback.embed(texts)

    async def similarity(self, text_a: str, text_b: str) -> float:
        if await self.primary.is_available():
            try:
                return await self.primary.similarity(text_a, text_b)
            except Exception:
                pass
        return await self.fallback.similarity(text_a, text_b)
