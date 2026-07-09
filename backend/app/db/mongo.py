import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.config import settings

logger = logging.getLogger("rescueai.db")

class MockInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class MockUpdateResult:
    def __init__(self, modified_count):
        self.modified_count = modified_count

class MockCursor:
    def __init__(self, documents):
        self.documents = documents
        self.index = 0

    def sort(self, *args, **kwargs):
        # In a mock, we can just do basic sorting if needed, or return self
        # Let's support sorting by score (descending) or created_at (descending)
        if args:
            key, direction = args[0]
            reverse = direction == -1
            try:
                self.documents = sorted(
                    self.documents, 
                    key=lambda x: x.get(key) if x.get(key) is not None else (0 if isinstance(x.get(key), (int, float)) else ""),
                    reverse=reverse
                )
            except Exception as e:
                logger.error(f"Error sorting mock documents: {e}")
        return self

    def limit(self, count):
        self.documents = self.documents[:count]
        return self

    async def to_list(self, length=None):
        if length is not None:
            return self.documents[:length]
        return self.documents

    def __aiter__(self):
        self.index = 0
        return self

    async def __anext__(self):
        if self.index < len(self.documents):
            val = self.documents[self.index]
            self.index += 1
            return val
        else:
            raise StopAsyncIteration

class MockCollection:
    def __init__(self, name):
        self.name = name
        self.store = {}

    async def insert_one(self, document):
        doc = dict(document)
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        elif isinstance(doc["_id"], str):
            try:
                doc["_id"] = ObjectId(doc["_id"])
            except Exception:
                pass
        self.store[doc["_id"]] = doc
        return MockInsertResult(doc["_id"])

    async def find_one(self, query):
        if isinstance(query, (str, ObjectId)):
            query = {"_id": query}
        
        # Parse query
        for doc_id, doc in self.store.items():
            match = True
            for k, v in query.items():
                if k == "_id":
                    if isinstance(v, str):
                        try:
                            v = ObjectId(v)
                        except Exception:
                            pass
                    if doc_id != v:
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                return doc
        return None

    def find(self, query=None):
        query = query or {}
        results = []
        for doc_id, doc in self.store.items():
            match = True
            for k, v in query.items():
                if k == "_id":
                    if isinstance(v, str):
                        try:
                            v = ObjectId(v)
                        except Exception:
                            pass
                    if doc_id != v:
                        match = False
                        break
                elif isinstance(v, dict) and "$in" in v:
                    # Mock $in operator
                    if doc.get(k) not in v["$in"]:
                        match = False
                        break
                elif isinstance(v, dict) and "$near" in v:
                    # Ignore geographic queries in simple mock
                    pass
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                results.append(doc)
        return MockCursor(results)

    async def update_one(self, query, update):
        doc = await self.find_one(query)
        if not doc:
            return MockUpdateResult(0)
        
        # Apply set operations
        if "$set" in update:
            for k, v in update["$set"].items():
                # Handle nested updates (e.g. location.lat)
                if "." in k:
                    parts = k.split(".")
                    curr = doc
                    for part in parts[:-1]:
                        if part not in curr:
                            curr[part] = {}
                        curr = curr[part]
                    curr[parts[-1]] = v
                else:
                    doc[k] = v
        self.store[doc["_id"]] = doc
        return MockUpdateResult(1)

    async def delete_one(self, query):
        doc = await self.find_one(query)
        if doc:
            del self.store[doc["_id"]]
            return MockUpdateResult(1)
        return MockUpdateResult(0)

    async def count_documents(self, query=None):
        cursor = self.find(query)
        return len(cursor.documents)

    async def create_index(self, *args, **kwargs):
        pass

class MockDatabase:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]

# Global DB Client
db_client = None
db = None
is_mock_db = False

async def init_db():
    global db_client, db, is_mock_db
    # Try to connect to real Mongo
    if settings.MONGODB_URL:
        try:
            logger.info(f"Connecting to MongoDB at: {settings.MONGODB_URL}")
            # Set short timeout so it fails fast if not running
            client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
            # Test connection
            await client.admin.command('ping')
            db_client = client
            db = client[settings.DATABASE_NAME]
            is_mock_db = False
            logger.info("Connected to MongoDB successfully.")
            return db
        except Exception as e:
            logger.warning(f"Failed to connect to MongoDB ({e}). Falling back to In-Memory Mock DB.")
            
    # Fallback to Mock Database
    db = MockDatabase()
    is_mock_db = True
    logger.info("In-memory Mock Database initialized.")
    return db

def get_db():
    global db
    if db is None:
        # In case it hasn't been initialized, we return a mock db immediately
        db = MockDatabase()
        is_mock_db = True
    return db
