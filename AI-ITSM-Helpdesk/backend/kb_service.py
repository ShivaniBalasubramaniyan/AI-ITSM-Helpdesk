"""
Knowledge Base Service
Loads, indexes, and searches approved IT markdown documentation from the knowledge_base/ directory.
Integrates user feedback scores and powers RAG retrieval for the AI Assistant.
"""

import os
import re
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
try:
    from backend.database import get_kb_feedback_stats, record_kb_feedback, save_knowledge_article_cloud
except (ImportError, ValueError):
    from database import get_kb_feedback_stats, record_kb_feedback, save_knowledge_article_cloud  # type: ignore

KB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge_base"))

class KBService:
    def __init__(self, kb_dir: str = KB_DIR):
        self.kb_dir = kb_dir
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.reload_articles()

    def reload_articles(self):
        self._cache = {}
        if not os.path.exists(self.kb_dir):
            return

        for filename in sorted(os.listdir(self.kb_dir)):
            if filename.endswith(".md") and filename != "README.md":
                filepath = os.path.join(self.kb_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        raw_content = f.read()
                    article = self._parse_markdown(filename, raw_content)
                    self._cache[article["id"]] = article
                except Exception as e:
                    print(f"Error loading KB article {filename}: {e}")

    def _parse_markdown(self, filename: str, content: str) -> Dict[str, Any]:
        lines = content.split("\n")
        title = "IT Documentation"
        art_id = filename.replace(".md", "").split("_")[0]
        category = "General"
        tags = []
        created = "2026-01-01"
        updated = "2026-02-01"

        body_lines = []
        in_front = False

        for line in lines:
            line_stripped = line.strip()
            if line_stripped.startswith("# "):
                title = line_stripped[2:].strip()
            elif line_stripped.startswith("- **Article ID**:") or line_stripped.startswith("**Article ID**:"):
                art_id = line_stripped.split(":", 1)[1].strip().replace("*", "")
            elif line_stripped.startswith("- **Category**:") or line_stripped.startswith("**Category**:"):
                category = line_stripped.split(":", 1)[1].strip().replace("*", "")
            elif line_stripped.startswith("- **Tags**:") or line_stripped.startswith("**Tags**:"):
                tag_str = line_stripped.split(":", 1)[1].strip().replace("*", "")
                tags = [t.strip().lower() for t in tag_str.split(",") if t.strip()]
            elif line_stripped.startswith("- **Created**:") or line_stripped.startswith("**Created**:"):
                created = line_stripped.split(":", 1)[1].strip().replace("*", "")
            elif line_stripped.startswith("- **Updated**:") or line_stripped.startswith("**Updated**:"):
                updated = line_stripped.split(":", 1)[1].strip().replace("*", "")
            else:
                body_lines.append(line)

        body_text = "\n".join(body_lines).strip()
        # Create summary from first non-header paragraph
        paragraphs = [p.strip() for p in body_text.split("\n\n") if p.strip() and not p.strip().startswith("#")]
        summary = paragraphs[0] if paragraphs else "Approved IT operational guideline."
        if len(summary) > 200:
            summary = summary[:197] + "..."

        return {
            "id": art_id,
            "filename": filename,
            "title": title,
            "category": category,
            "tags": tags,
            "created": created,
            "updated": updated,
            "summary": summary,
            "content": content
        }

    def list_articles(self, category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        self.reload_articles()
        try:
            stats = get_kb_feedback_stats()
        except Exception as e:
            print(f"[KBService] Feedback lookup error ({e}), defaulting to zero counts.")
            stats = {}
        results = []

        for art in self._cache.values():
            if category and category.lower() != "all" and art["category"].lower() != category.lower():
                continue

            fb = stats.get(art["id"], {"helpful": 0, "not_helpful": 0})
            item = {
                "id": art["id"],
                "title": art["title"],
                "category": art["category"],
                "tags": art["tags"],
                "created": art["created"],
                "updated": art["updated"],
                "helpful_count": fb["helpful"],
                "not_helpful_count": fb["not_helpful"],
                "summary": art["summary"]
            }

            if search:
                query_tokens = [q.lower() for q in re.findall(r"\w+", search) if len(q) > 2]
                text_to_search = f"{art['title']} {art['summary']} {' '.join(art['tags'])} {art['content']}".lower()
                matches = sum(1 for token in query_tokens if token in text_to_search)
                if matches > 0:
                    item["_score"] = matches
                    results.append(item)
            else:
                results.append(item)

        if search:
            results.sort(key=lambda x: x.get("_score", 0), reverse=True)
            for r in results:
                r.pop("_score", None)

        return results

    def get_article(self, article_id: str) -> Optional[Dict[str, Any]]:
        self.reload_articles()
        art = self._cache.get(article_id)
        if not art:
            # Fallback search by ID substring
            for k, v in self._cache.items():
                if k.lower() == article_id.lower() or article_id.lower() in v["filename"].lower():
                    art = v
                    break
        if not art:
            return None

        try:
            stats = get_kb_feedback_stats()
        except Exception as e:
            print(f"[KBService] Feedback lookup error ({e}), defaulting to zero counts.")
            stats = {}
        fb = stats.get(art["id"], {"helpful": 0, "not_helpful": 0})

        # Find related articles (same category or common tags)
        related = []
        for other_id, other in self._cache.items():
            if other_id == art["id"]:
                continue
            common_tags = set(art["tags"]).intersection(set(other["tags"]))
            if other["category"] == art["category"] or len(common_tags) > 0:
                related.append({
                    "id": other["id"],
                    "title": other["title"],
                    "category": other["category"]
                })
            if len(related) >= 3:
                break

        return {
            "id": art["id"],
            "title": art["title"],
            "category": art["category"],
            "tags": art["tags"],
            "created": art["created"],
            "updated": art["updated"],
            "helpful_count": fb["helpful"],
            "not_helpful_count": fb["not_helpful"],
            "summary": art["summary"],
            "content": art["content"],
            "related_articles": related
        }

    def search_relevant(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        self.reload_articles()
        tokens = [t.lower() for t in re.findall(r"\w+", query) if len(t) > 2]
        if not tokens:
            return list(self._cache.values())[:top_k]

        scored = []
        for art in self._cache.values():
            score = 0
            title_lower = art["title"].lower()
            tags_lower = [t.lower() for t in art["tags"]]
            content_lower = art["content"].lower()

            for tok in tokens:
                if tok in title_lower:
                    score += 5
                if tok in tags_lower:
                    score += 4
                if tok in content_lower:
                    score += 1

            if score > 0:
                scored.append((score, art))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def create_article(
        self,
        title: str,
        category: str,
        content: str,
        tags: Optional[List[str]] = None,
        summary: Optional[str] = None,
        author: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates and indexes a new IT Standard Operating Procedure (SOP) Runbook."""
        self.reload_articles()

        # 1. Determine next KB id (e.g. KB009, KB010)
        existing_nums = []
        for k in self._cache.keys():
            m = re.match(r"^KB(\d+)$", k, re.IGNORECASE)
            if m:
                existing_nums.append(int(m.group(1)))

        next_num = max(existing_nums) + 1 if existing_nums else 1
        art_id = f"KB{next_num:03d}"

        # 2. Slug and filepath
        clean_title = (title or "IT SOP Runbook").strip()
        slug = re.sub(r"[^a-z0-9]+", "_", clean_title.lower()).strip("_")[:40] or "runbook"
        filename = f"{art_id}_{slug}.md"
        filepath = os.path.join(self.kb_dir, filename)

        # 3. Clean tags and metadata
        clean_tags = [t.strip().lower() for t in (tags or []) if t.strip()]
        if not clean_tags:
            clean_tags = [w.lower() for w in re.findall(r"\w+", clean_title) if len(w) > 3]
        tags_str = ", ".join(clean_tags)

        now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        author_str = author.strip() if author else "IT Knowledge Engineering"

        # 4. Construct formatted markdown
        raw_content = f"# {clean_title}\n"
        raw_content += f"- **Article ID**: {art_id}\n"
        raw_content += f"- **Category**: {category.strip() or 'General'}\n"
        raw_content += f"- **Tags**: {tags_str}\n"
        raw_content += f"- **Author**: {author_str}\n"
        raw_content += f"- **Created**: {now_date}\n"
        raw_content += f"- **Updated**: {now_date}\n\n"
        raw_content += content.strip() + "\n"

        # 5. Persist to file
        os.makedirs(self.kb_dir, exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(raw_content)

        # 6. Reload and parse
        self.reload_articles()
        article = self.get_article(art_id)

        # 7. Cloud sync if MongoDB Atlas is active
        try:
            save_knowledge_article_cloud(article)
        except Exception:
            pass

        return article

kb_service = KBService()
