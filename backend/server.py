from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# Models
class Resident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: str
    phone: str
    vehicle_plate: Optional[str] = ""
    photo_base64: Optional[str] = ""
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ResidentCreate(BaseModel):
    name: str
    unit: str
    phone: str
    vehicle_plate: Optional[str] = ""
    photo_base64: Optional[str] = ""
    status: str = "active"


class ResidentUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    phone: Optional[str] = None
    vehicle_plate: Optional[str] = None
    photo_base64: Optional[str] = None
    status: Optional[str] = None


class AccessLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resident_id: str
    resident_name: str
    unit: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "verified"


class AccessLogCreate(BaseModel):
    resident_id: str
    resident_name: str
    unit: str
    status: str = "verified"


# Seed data
SEED_RESIDENTS = [
    {
        "id": "RES001",
        "name": "Rajesh Kumar",
        "unit": "A-101",
        "phone": "+91 98765 43210",
        "vehicle_plate": "KA 01 AB 1234",
        "photo_base64": "",
        "status": "active",
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z"
    },
    {
        "id": "RES002",
        "name": "Priya Sharma",
        "unit": "B-205",
        "phone": "+91 87654 32109",
        "vehicle_plate": "KA 02 CD 5678",
        "photo_base64": "",
        "status": "active",
        "created_at": "2024-02-10T10:00:00Z",
        "updated_at": "2024-02-10T10:00:00Z"
    },
    {
        "id": "RES003",
        "name": "Amit Patel",
        "unit": "C-302",
        "phone": "+91 76543 21098",
        "vehicle_plate": "KA 03 EF 9012",
        "photo_base64": "",
        "status": "active",
        "created_at": "2024-03-05T10:00:00Z",
        "updated_at": "2024-03-05T10:00:00Z"
    },
    {
        "id": "RES004",
        "name": "Sneha Reddy",
        "unit": "A-404",
        "phone": "+91 65432 10987",
        "vehicle_plate": "",
        "photo_base64": "",
        "status": "active",
        "created_at": "2024-04-20T10:00:00Z",
        "updated_at": "2024-04-20T10:00:00Z"
    },
    {
        "id": "RES005",
        "name": "Mohammed Ali",
        "unit": "D-102",
        "phone": "+91 54321 09876",
        "vehicle_plate": "KA 05 GH 3456",
        "photo_base64": "",
        "status": "inactive",
        "created_at": "2024-05-12T10:00:00Z",
        "updated_at": "2024-05-12T10:00:00Z"
    }
]


@app.on_event("startup")
async def seed_database():
    """Seed the database with sample residents if empty."""
    count = await db.residents.count_documents({})
    if count == 0:
        for resident in SEED_RESIDENTS:
            await db.residents.insert_one(resident)
        logging.info("Seeded database with sample residents")


# Residents endpoints
@api_router.get("/residents", response_model=List[Resident])
async def get_residents():
    residents = await db.residents.find({}, {"_id": 0}).to_list(1000)
    return residents


@api_router.get("/residents/{resident_id}", response_model=Resident)
async def get_resident(resident_id: str):
    resident = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    return resident


@api_router.post("/residents", response_model=Resident)
async def create_resident(data: ResidentCreate):
    resident = Resident(**data.dict())
    await db.residents.insert_one(resident.dict())
    result = await db.residents.find_one({"id": resident.id}, {"_id": 0})
    return result


@api_router.put("/residents/{resident_id}", response_model=Resident)
async def update_resident(resident_id: str, data: ResidentUpdate):
    existing = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Resident not found")

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.residents.update_one({"id": resident_id}, {"$set": update_data})
    updated = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    return updated


@api_router.delete("/residents/{resident_id}")
async def delete_resident(resident_id: str):
    result = await db.residents.delete_one({"id": resident_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resident not found")
    return {"message": "Resident deleted"}


# Access logs endpoints
@api_router.get("/access-logs", response_model=List[AccessLog])
async def get_access_logs():
    logs = await db.access_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return logs


@api_router.post("/access-logs", response_model=AccessLog)
async def create_access_log(data: AccessLogCreate):
    log = AccessLog(**data.dict())
    await db.access_logs.insert_one(log.dict())
    result = await db.access_logs.find_one({"id": log.id}, {"_id": 0})
    return result


# Sync endpoint - returns all residents for local download
@api_router.get("/sync")
async def sync_residents():
    residents = await db.residents.find({}, {"_id": 0}).to_list(5000)
    return {
        "residents": residents,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "count": len(residents)
    }


@api_router.get("/")
async def root():
    return {"message": "Gate ID Check API", "status": "online"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
