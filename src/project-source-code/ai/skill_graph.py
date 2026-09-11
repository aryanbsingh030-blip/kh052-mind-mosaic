"""
Skill Graph — NetworkX-based skill relationship graph.

Models relationships between skills for:
- Skill prerequisite chains
- Related skill discovery
- Skill cluster analysis
- Campus skill-gap visualization
"""

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False

from typing import Dict, List, Optional, Set, Tuple


class SkillGraph:
    """
    A graph of skill relationships.

    Nodes are skills, edges represent relationships like:
    - "subskill_of" / "child_of" — CNN is child of Deep Learning
    - "prerequisite_of" — Python is a prerequisite of Django
    - "related_to" — React is related to Vue
    - "part_of" — CSS is part of Web Development
    """

    def __init__(self, preload_taxonomy: bool = False):
        self._adjacency: Dict[str, Dict[str, str]] = {}
        self._categories: Dict[str, str] = {}
        self._aliases: Dict[str, str] = {}
        if HAS_NETWORKX:
            self._graph = nx.DiGraph()
            self._undirected_graph = nx.Graph()
        else:
            self._graph = None
            self._undirected_graph = None
        if preload_taxonomy:
            self._load_default_taxonomy()

    @property
    def available(self) -> bool:
        """Check if NetworkX is available."""
        return HAS_NETWORKX and self._graph is not None

    def add_skill(self, name: str, category: Optional[str] = None, aliases: Optional[List[str]] = None, **attrs):
        """Add a skill node to the graph."""
        norm_name = name.strip()
        if norm_name not in self._adjacency:
            self._adjacency[norm_name] = {}
        if category:
            self._categories[norm_name] = category

        if aliases:
            for al in aliases:
                self._aliases[al.strip().lower()] = norm_name

        if self.available:
            self._graph.add_node(norm_name, category=category, **attrs)
            self._undirected_graph.add_node(norm_name, category=category, **attrs)

    def add_relationship(self, from_skill: str, to_skill: str, relation_type: str = "related_to"):
        """Add a directed relationship between two skills."""
        s1 = from_skill.strip()
        s2 = to_skill.strip()
        self.add_skill(s1)
        self.add_skill(s2)

        self._adjacency[s1][s2] = relation_type
        if s2 not in self._adjacency:
            self._adjacency[s2] = {}

        if self.available:
            self._graph.add_edge(s1, s2, relation=relation_type)
            self._undirected_graph.add_edge(s1, s2, relation=relation_type)

    def canonical_name(self, name: str) -> str:
        """Resolve any alias or return normalized skill name."""
        lowered = name.strip().lower()
        if lowered in self._aliases:
            return self._aliases[lowered]
        for node in self._adjacency:
            if node.lower() == lowered:
                return node
        return name.strip()

    def get_distance(self, skill_a: str, skill_b: str) -> Optional[int]:
        """Compute shortest path hop distance between two skills (undirected)."""
        c_a = self.canonical_name(skill_a)
        c_b = self.canonical_name(skill_b)

        if c_a == c_b:
            return 0

        if self.available:
            if c_a in self._undirected_graph and c_b in self._undirected_graph:
                try:
                    return nx.shortest_path_length(self._undirected_graph, c_a, c_b)
                except nx.NetworkXNoPath:
                    return None
            return None

        # Fallback BFS using adjacency dictionary
        visited = {c_a}
        queue: List[Tuple[str, int]] = [(c_a, 0)]
        while queue:
            curr, dist = queue.pop(0)
            neighbors: Set[str] = set(self._adjacency.get(curr, {}).keys())
            # Add reverse edges for undirected BFS
            for node, adj in self._adjacency.items():
                if curr in adj:
                    neighbors.add(node)
            for n in neighbors:
                if n == c_b:
                    return dist + 1
                if n not in visited:
                    visited.add(n)
                    queue.append((n, dist + 1))
        return None

    def get_proximity(self, skill_a: str, skill_b: str) -> float:
        """
        Calculate hierarchical proximity between two skills in range [0.0, 1.0].
        - Same skill: 1.0
        - 1 hop (direct child/parent/prerequisite): 0.85
        - 2 hops (e.g. CNN -> Deep Learning -> Machine Learning): 0.70
        - 3 hops: 0.55
        - Same category (even without direct link): 0.40
        - Unconnected: 0.0
        """
        c_a = self.canonical_name(skill_a)
        c_b = self.canonical_name(skill_b)

        if c_a.lower() == c_b.lower():
            return 1.0

        dist = self.get_distance(c_a, c_b)
        if dist is not None:
            if dist == 1:
                return 0.85
            elif dist == 2:
                return 0.70
            elif dist == 3:
                return 0.55
            else:
                return max(0.20, 0.85 ** dist)

        cat_a = self._categories.get(c_a)
        cat_b = self._categories.get(c_b)
        if cat_a and cat_b and cat_a.lower() == cat_b.lower():
            return 0.40

        return 0.0

    def get_related_skills(self, skill_name: str, depth: int = 1) -> list[dict]:
        """Get skills related to the given skill within N hops."""
        c_name = self.canonical_name(skill_name)
        if not self.available or c_name not in self._graph:
            # simple fallback
            related = []
            for neighbor, rel in self._adjacency.get(c_name, {}).items():
                related.append({
                    "skill": neighbor,
                    "category": self._categories.get(neighbor),
                    "relation": rel,
                })
            return related

        related = []
        visited = {c_name}
        frontier = [c_name]

        for _ in range(depth):
            next_frontier = []
            for node in frontier:
                for neighbor in list(self._graph.successors(node)) + list(self._graph.predecessors(node)):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        next_frontier.append(neighbor)
                        edge_data = self._graph.get_edge_data(node, neighbor) or self._graph.get_edge_data(neighbor, node)
                        related.append({
                            "skill": neighbor,
                            "category": self._graph.nodes[neighbor].get("category"),
                            "relation": edge_data.get("relation", "related_to") if edge_data else "related_to",
                        })
            frontier = next_frontier

        return related

    def get_skill_categories(self) -> dict[str, list[str]]:
        """Get all skills grouped by category."""
        categories: dict[str, list[str]] = {}
        for node, cat in self._categories.items():
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(node)
        return categories

    def get_stats(self) -> dict:
        """Get graph statistics."""
        total_edges = self._graph.number_of_edges() if self.available else sum(len(v) for v in self._adjacency.values())
        total_nodes = self._graph.number_of_nodes() if self.available else len(self._adjacency)
        return {
            "available": self.available,
            "total_skills": total_nodes,
            "total_relationships": total_edges,
            "categories": len(self.get_skill_categories()),
        }

    def _load_default_taxonomy(self):
        """Populate common hierarchical relationships across AI, Web, Systems, Data, Cloud."""
        skills_tree = [
            # AI & Machine Learning hierarchy
            ("Machine Learning", "AI & Machine Learning", None, ["ml"]),
            ("Deep Learning", "AI & Machine Learning", "Machine Learning", ["dl"]),
            ("Computer Vision", "AI & Machine Learning", "Deep Learning", ["cv"]),
            ("Convolutional Neural Networks", "AI & Machine Learning", "Computer Vision", ["cnn", "convnets"]),
            ("Natural Language Processing", "AI & Machine Learning", "Deep Learning", ["nlp"]),
            ("Large Language Models", "AI & Machine Learning", "Natural Language Processing", ["llm", "llms", "transformers"]),
            ("Reinforcement Learning", "AI & Machine Learning", "Machine Learning", ["rl"]),
            ("PyTorch", "AI & Machine Learning", "Deep Learning", ["torch"]),
            ("TensorFlow", "AI & Machine Learning", "Deep Learning", ["tf"]),
            ("Model Deployment", "AI & Machine Learning", "Machine Learning", ["mlops"]),
            
            # Programming & Full Stack
            ("Python", "Programming", None, ["py", "python3"]),
            ("JavaScript", "Programming", None, ["js", "es6"]),
            ("TypeScript", "Programming", "JavaScript", ["ts"]),
            ("React", "Web Development", "JavaScript", ["reactjs", "react.js"]),
            ("Next.js", "Web Development", "React", ["nextjs"]),
            ("Node.js", "Web Development", "JavaScript", ["node", "nodejs"]),
            ("FastAPI", "Web Development", "Python", ["fast api"]),
            ("Flask", "Web Development", "Python", []),
            ("Django", "Web Development", "Python", []),
            ("HTML & CSS", "Web Development", None, ["html", "css", "html5", "css3"]),
            ("Tailwind CSS", "Web Development", "HTML & CSS", ["tailwind", "tailwindcss"]),

            # Data & Databases
            ("Data Science", "Data Science", None, []),
            ("SQL & Relational Databases", "Data Science", None, ["sql", "rdbms"]),
            ("PostgreSQL", "Data Science", "SQL & Relational Databases", ["postgres"]),
            ("Pandas", "Data Science", "Python", []),
            ("NumPy", "Data Science", "Python", []),
            ("Scikit-Learn", "Data Science", "Machine Learning", ["sklearn"]),

            # Cloud & DevOps
            ("Cloud Computing", "Cloud & DevOps", None, ["cloud"]),
            ("Docker", "Cloud & DevOps", "Cloud Computing", ["containerization", "containers"]),
            ("Kubernetes", "Cloud & DevOps", "Docker", ["k8s"]),
            ("AWS", "Cloud & DevOps", "Cloud Computing", ["amazon web services"]),
            ("CI/CD", "Cloud & DevOps", "Cloud Computing", ["github actions", "pipelines"]),

            # Cybersecurity
            ("Cybersecurity", "Cybersecurity", None, ["infosec", "security"]),
            ("Penetration Testing", "Cybersecurity", "Cybersecurity", ["ethical hacking", "pen testing"]),
            ("Network Security", "Cybersecurity", "Cybersecurity", []),
            ("Cryptography", "Cybersecurity", "Cybersecurity", ["crypto"]),

            # UI/UX Design
            ("UI/UX Design", "Design", None, ["ui/ux", "product design"]),
            ("Figma", "Design", "UI/UX Design", []),
            ("User Research", "Design", "UI/UX Design", []),
            ("Wireframing & Prototyping", "Design", "UI/UX Design", ["prototyping"]),

            # Domain & Full Stack Essentials
            ("Agriculture", "Agriculture", None, ["agriculture & agritech", "agritech", "farming", "crop disease", "plant disease"]),
            ("Backend", "Web Development", None, ["backend development", "backend", "server-side"]),
            ("Frontend", "Web Development", None, ["frontend development", "frontend", "client-side"]),

            # Systems & Embedded
            ("Rust", "Programming", None, ["rustlang"]),
            ("C++", "Programming", None, ["cpp"]),
            ("Embedded Systems", "Systems & Hardware", None, ["embedded"]),
            ("Arduino & IoT", "Systems & Hardware", "Embedded Systems", ["iot", "arduino"]),
        ]

        for name, category, parent, aliases in skills_tree:
            self.add_skill(name, category=category, aliases=aliases)
            if parent:
                self.add_relationship(parent, name, relation_type="parent_of")

