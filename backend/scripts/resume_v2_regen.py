"""
Resume the v2 hallucination-hardened FAQ regeneration for glossary terms that
haven't yet been processed. Idempotent — skips terms that already have
faqs_prompt_version == "v2-hallucination-hardened".

Run: cd /app/backend && python3 scripts/resume_v2_regen.py
"""
import asyncio
import os
import sys

# Load env from /app/backend/.env before importing server
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient
from server import generate_faqs_for_term, now_iso  # reuse existing helper


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    todo = await db.glossary.find(
        {"faqs_prompt_version": {"$ne": "v2-hallucination-hardened"}},
        {"_id": 0, "slug": 1, "term": 1, "definition": 1},
    ).to_list(500)

    print(f"Resuming v2 regeneration for {len(todo)} terms still on v1...", flush=True)
    if not todo:
        print("All 396 already on v2 — nothing to do.", flush=True)
        return

    sem = asyncio.Semaphore(4)   # 4 concurrent Claude calls (matches server default)
    completed = 0
    failed = []

    async def gen_one(t):
        nonlocal completed
        async with sem:
            try:
                faqs = await generate_faqs_for_term(t["term"], t["definition"])
                if faqs:
                    await db.glossary.update_one(
                        {"slug": t["slug"]},
                        {"$set": {
                            "faqs": faqs,
                            "faqs_approved": False,
                            "faqs_generated_at": now_iso(),
                            "faqs_prompt_version": "v2-hallucination-hardened",
                        }},
                    )
                    completed += 1
                    if completed % 10 == 0:
                        print(f"  ...{completed}/{len(todo)}", flush=True)
                else:
                    failed.append(t.get("slug"))
            except Exception as e:
                failed.append(f"{t.get('slug')} ({e})")

    await asyncio.gather(*[gen_one(t) for t in todo], return_exceptions=True)

    print(f"\nDONE — {completed}/{len(todo)} terms regenerated to v2.", flush=True)
    if failed:
        print(f"Failed / skipped ({len(failed)}):", flush=True)
        for s in failed[:20]:
            print(f"  • {s}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
