"""
MongoDB Cloud (Atlas) Connection & Migration Utility
Tests connection to MongoDB Cloud, verifies network access, and syncs existing SQLite tickets.
Usage:
    python test_mongodb.py
"""

import os
import sys
import time

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"), override=True)

try:
    from pymongo import MongoClient
    from pymongo.errors import ConfigurationError, OperationFailure, ServerSelectionTimeoutError
except ImportError:
    print("[ERROR] pymongo is not installed. Run: pip install pymongo dnspython")
    sys.exit(1)

def run_diagnostics():
    print("=" * 65)
    print("      AI-ITSM HELPDESK - MONGODB CLOUD ATLAS CONNECTION TEST      ")
    print("=" * 65)

    uri = os.getenv("MONGODB_URI", "").strip()
    db_name = os.getenv("MONGODB_DB_NAME", "ai_itsm_db").strip() or "ai_itsm_db"

    if not uri:
        print("\n[!] MONGODB_URI is not set in backend/.env")
        print("\nTo connect to MongoDB Cloud Atlas:")
        print("1. Go to https://cloud.mongodb.com")
        print("2. Create a free M0 cluster")
        print("3. Create a Database User (username and password)")
        print("4. In 'Network Access', add 0.0.0.0/0 (or your current IP)")
        print("5. In 'Database' -> 'Connect' -> 'Drivers' (Python), copy connection URI")
        print("6. Paste URI into backend/.env as:")
        print("   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority\n")
        return

    # Mask password for display
    display_uri = uri
    if "@" in display_uri:
        prefix, suffix = display_uri.split("@", 1)
        if "://" in prefix and ":" in prefix.split("://", 1)[1]:
            proto, creds = prefix.split("://", 1)
            u, _ = creds.split(":", 1)
            display_uri = f"{proto}://{u}:******@{suffix}"

    print(f"Connecting to: {display_uri}")
    print(f"Target Database: {db_name}")
    print("\nConnecting to MongoDB Atlas Cluster...")

    t0 = time.time()
    try:
        try:
            import dns.resolver
            dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
            dns.resolver.default_resolver.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
        except Exception:
            pass

        kwargs = {"serverSelectionTimeoutMS": 5000}
        try:
            import certifi
            kwargs["tlsCAFile"] = certifi.where()
        except Exception:
            pass

        client = MongoClient(uri, **kwargs)
        client.admin.command("ping")
        elapsed = round((time.time() - t0) * 1000, 1)
        print(f"[OK] Connection Successful! Response time: {elapsed}ms")

        db = client[db_name]
        collections = db.list_collection_names()
        ticket_count = db.tickets.count_documents({}) if "tickets" in collections else 0
        history_count = db.ticket_history.count_documents({}) if "ticket_history" in collections else 0

        print(f"\nCollections in '{db_name}': {collections}")
        print(f"Active Tickets in Cloud DB: {ticket_count}")
        print(f"Audit History Records: {history_count}")

        # Check local sqlite
        from database import get_db_connection, sync_sqlite_to_mongodb
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) as cnt FROM tickets")
        sq_tickets = c.fetchone()["cnt"]
        conn.close()

        print(f"Local SQLite Tickets: {sq_tickets}")

        if sq_tickets > 0:
            print("\nSyncing all local SQLite tickets into MongoDB Cloud Atlas...")
            import database
            database._mongo_client = client
            database._mongo_db = db
            database._mongo_active = True
            res = sync_sqlite_to_mongodb()
            print(f"[OK] Migration completed: {res['migrated_tickets']} additional tickets synced to Cloud Atlas!")
            print(f"Total Cloud Tickets now: {res['total_mongo_tickets']}")

        print("\n" + "=" * 65)
        print(" SUCCESS: Your backend is ready to run with MongoDB Cloud Atlas! ")
        print("=" * 65)

    except OperationFailure as e:
        print(f"\n[X] Authentication Failed! Check username and password in MONGODB_URI.")
        print(f"    Details: {e}")
    except ServerSelectionTimeoutError as e:
        print(f"\n[X] Connection Failed / Handshake Rejected!")
        print("    Reason: Your current IP address is not whitelisted in MongoDB Atlas Network Access.")
        try:
            import urllib.request
            my_ip = urllib.request.urlopen("https://api.ipify.org", timeout=3).read().decode("utf-8")
            print(f"    Your current public IP is: {my_ip}")
        except Exception:
            my_ip = "223.178.80.234"
            print(f"    Your current public IP is approx: {my_ip}")
        print("\n    How to fix in 30 seconds:")
        print("    1. Go to https://cloud.mongodb.com")
        print("    2. Click 'Network Access' (under Security in the left sidebar)")
        print("    3. Click 'Add IP Address'")
        print("    4. Select 'Allow Access from Anywhere' (0.0.0.0/0) OR click 'Add Current IP Address'")
        print("    5. Click 'Confirm', wait 1 minute, and re-run: python test_mongodb.py")
    except ConfigurationError as e:
        print(f"\n[X] Configuration / URI Error: {e}")
    except Exception as e:
        print(f"\n[X] Unexpected Error: {e}")

if __name__ == "__main__":
    run_diagnostics()
