import os
import json
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

app = FastAPI(title="PGFinder Owner API", version="1.0.0")

# Enable CORS for local react client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DATABASE INITIALIZATION ──────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY and "your-project-id" not in SUPABASE_URL:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Connected to Supabase successfully!")
    except Exception as e:
        print(f"Warning: Supabase client failed to initialize: {e}")

# Local JSON Mock DB setup if Supabase is offline
MOCK_DB_PATH = os.path.join(os.path.dirname(__file__), "db_mock.json")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

# Setup mock database with seeds
def init_mock_db():
    if os.path.exists(MOCK_DB_PATH):
        try:
            with open(MOCK_DB_PATH, "r") as f:
                json.load(f)
            return
        except Exception:
            pass

    # Generate initial seeds
    default_hash = hash_password("password123")
    
    mock_data = {
        "owners": [
            {
                "id": 1,
                "pg_name": "Comfort Zone PG",
                "password_hash": default_hash,
                "owner_name": "John Doe",
                "email": "comfortzone@example.com",
                "phone_number": "9876543210",
                "created_date": datetime.now(timezone.utc).isoformat(),
                "last_login": None
            },
            {
                "id": 2,
                "pg_name": "Green Valley PG",
                "password_hash": default_hash,
                "owner_name": "Jane Smith",
                "email": "greenvalley@example.com",
                "phone_number": "9876543211",
                "created_date": datetime.now(timezone.utc).isoformat(),
                "last_login": None
            }
        ],
        "pg_listings": [
            {
                "id": 1,
                "name": "Green Valley PG",
                "location": "Marathahalli",
                "gender": "Female",
                "rent": 9000,
                "rating": 4.6,
                "distance": "1.2 km",
                "amenities": ["WiFi", "Food", "Laundry", "CCTV", "Hot Water"],
                "total_floors": 4,
                "image": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80"
            },
            {
                "id": 2,
                "name": "Comfort Zone PG",
                "location": "Marathahalli",
                "gender": "Female",
                "rent": 10500,
                "rating": 4.9,
                "distance": "1.5 km",
                "amenities": ["WiFi", "Lift", "Food", "Hot Water", "Laundry", "CCTV", "AC"],
                "total_floors": 6,
                "image": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80"
            }
        ],
        "rooms": [],
        "bookings": []
    }

    # Generate rooms for PG listings
    sharing_types = ["single", "double", "triple", "four"]
    prices = {"single": 10000, "double": 8000, "triple": 6500, "four": 5000}
    
    room_id_counter = 1
    for pg in mock_data["pg_listings"]:
        for floor in range(1, pg["total_floors"] + 1):
            for room in range(1, 5):
                room_number = floor * 100 + room
                sharing = sharing_types[(room - 1) % len(sharing_types)]
                rent = pg["rent"] if sharing == "double" else prices[sharing]
                
                # status distribution
                seed = (room_number * 7 + floor * 3) % 10
                status = "available" if seed < 5 else ("booked" if seed < 8 else "maintenance")
                
                mock_data["rooms"].append({
                    "id": room_id_counter,
                    "pg_id": pg["id"],
                    "room_number": room_number,
                    "floor": floor,
                    "sharing": sharing,
                    "rent": rent,
                    "status": status,
                    "has_attached_bathroom": room <= 2,
                    "is_ac": room == 1 or room == 4,
                    "has_balcony": room == 4
                })
                room_id_counter += 1

    with open(MOCK_DB_PATH, "w") as f:
        json.dump(mock_data, f, indent=2)

init_mock_db()

def read_mock_db() -> Dict[str, Any]:
    with open(MOCK_DB_PATH, "r") as f:
        return json.load(f)

def write_mock_db(data: Dict[str, Any]):
    with open(MOCK_DB_PATH, "w") as f:
        json.dump(data, f, indent=2)

# Ensure database table seed for Supabase
def seed_supabase_owners():
    if not supabase:
        return
    try:
        # Check if owners table exists and has rows
        res = supabase.from_("owners").select("count", count="exact").execute()
        if res.count == 0:
            default_hash = hash_password("password123")
            supabase.from_("owners").insert([
                {
                    "pg_name": "Comfort Zone PG",
                    "password_hash": default_hash,
                    "owner_name": "John Doe",
                    "email": "comfortzone@example.com",
                    "phone_number": "9876543210"
                },
                {
                    "pg_name": "Green Valley PG",
                    "password_hash": default_hash,
                    "owner_name": "Jane Smith",
                    "email": "greenvalley@example.com",
                    "phone_number": "9876543211"
                }
            ]).execute()
            print("Seeded owners table in Supabase!")
    except Exception as e:
        print(f"Skipping Supabase owner seeding: {e}")

seed_supabase_owners()

# ─── JWT & RATE LIMITING CONFIGURATION ────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "owner-jwt-secret-key-987654321")
JWT_ALGORITHM = "HS256"

# In-memory store to prevent brute-force attacks on login
login_attempts: Dict[str, Dict[str, Any]] = {}

def apply_rate_limit(pg_name: str):
    now = datetime.now()
    if pg_name in login_attempts:
        record = login_attempts[pg_name]
        if record["blocked_until"] and now < record["blocked_until"]:
            delta = int((record["blocked_until"] - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Please try again in {delta} seconds."
            )

def register_failed_attempt(pg_name: str):
    now = datetime.now()
    if pg_name not in login_attempts:
        login_attempts[pg_name] = {"attempts": 1, "blocked_until": None}
    else:
        record = login_attempts[pg_name]
        record["attempts"] += 1
        if record["attempts"] >= 5:
            record["blocked_until"] = now + timedelta(seconds=30)
            record["attempts"] = 0

def clear_failed_attempts(pg_name: str):
    if pg_name in login_attempts:
        login_attempts.pop(pg_name)

# Dependency for authenticating JWT tokens
def get_current_owner(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        pg_name = payload.get("sub")
        if not pg_name:
            raise HTTPException(status_code=401, detail="Invalid payload.")
        return pg_name
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session token.")

# ─── DATA MODELS ──────────────────────────────────────────────────────────────
class OwnerLoginRequest(BaseModel):
    pg_name: str
    password: str

class OwnerRegisterRequest(BaseModel):
    pg_name: str
    password: str
    owner_name: str
    email: EmailStr
    phone_number: Optional[str] = None

class PGUpdateRequest(BaseModel):
    location: str
    gender: str
    rent: int
    amenities: List[str]
    image: Optional[str] = None

class RoomCreateRequest(BaseModel):
    room_number: int
    floor: int
    sharing: str
    rent: int
    status: str = "available"
    has_attached_bathroom: bool = True
    is_ac: bool = False
    has_balcony: bool = False

class BookingStatusUpdateRequest(BaseModel):
    status: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@app.post("/api/owner/signup")
def owner_signup(req: OwnerRegisterRequest):
    hashed = hash_password(req.password)
    
    if supabase:
        try:
            # Check if pg_name exists
            check = supabase.from_("owners").select("*").eq("pg_name", req.pg_name).execute()
            if len(check.data) > 0:
                raise HTTPException(status_code=400, detail="Owner/PG Name already registered.")
            
            res = supabase.from_("owners").insert([{
                "pg_name": req.pg_name,
                "password_hash": hashed,
                "owner_name": req.owner_name,
                "email": req.email,
                "phone_number": req.phone_number
            }]).execute()
            return {"message": "Owner registered successfully"}
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        if any(o["pg_name"].lower() == req.pg_name.lower() for o in db["owners"]):
            raise HTTPException(status_code=400, detail="Owner/PG Name already registered.")
        
        new_id = max([o["id"] for o in db["owners"]]) + 1 if db["owners"] else 1
        new_owner = {
            "id": new_id,
            "pg_name": req.pg_name,
            "password_hash": hashed,
            "owner_name": req.owner_name,
            "email": req.email,
            "phone_number": req.phone_number,
            "created_date": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        }
        db["owners"].append(new_owner)
        write_mock_db(db)
        return {"message": "Owner registered successfully (Offline Mock mode)"}

@app.post("/api/owner/login")
def owner_login(req: OwnerLoginRequest):
    apply_rate_limit(req.pg_name)
    
    owner_profile = None
    if supabase:
        try:
            res = supabase.from_("owners").select("*").eq("pg_name", req.pg_name).execute()
            if len(res.data) == 0:
                register_failed_attempt(req.pg_name)
                raise HTTPException(status_code=404, detail="PG not found.")
            
            owner_profile = res.data[0]
            if not verify_password(req.password, owner_profile["password_hash"]):
                register_failed_attempt(req.pg_name)
                raise HTTPException(status_code=400, detail="Invalid PG Name or Password.")
            
            # Update last login
            supabase.from_("owners").update({"last_login": datetime.now(timezone.utc).isoformat()}).eq("id", owner_profile["id"]).execute()
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        matched = [o for o in db["owners"] if o["pg_name"].lower() == req.pg_name.lower()]
        if not matched:
            register_failed_attempt(req.pg_name)
            raise HTTPException(status_code=404, detail="PG not found.")
        
        owner_profile = matched[0]
        if not verify_password(req.password, owner_profile["password_hash"]):
            register_failed_attempt(req.pg_name)
            raise HTTPException(status_code=400, detail="Invalid PG Name or Password.")
        
        owner_profile["last_login"] = datetime.now(timezone.utc).isoformat()
        write_mock_db(db)

    clear_failed_attempts(req.pg_name)
    token = create_jwt_token(owner_profile["pg_name"])
    
    return {
        "token": token,
        "pg_name": owner_profile["pg_name"],
        "owner_name": owner_profile["owner_name"],
        "email": owner_profile["email"]
    }

@app.get("/api/owner/dashboard")
def get_owner_dashboard(pg_name: str = Depends(get_current_owner)):
    if supabase:
        try:
            # 1. Get PG info
            pg_res = supabase.from_("pg_listings").select("*").eq("name", pg_name).execute()
            if len(pg_res.data) == 0:
                # Auto create a PG listing for the owner if they don't have one
                pg_insert = supabase.from_("pg_listings").insert([{
                    "name": pg_name,
                    "location": "Marathahalli",
                    "rent": 8500,
                    "gender": "Any"
                }]).execute()
                pg_info = pg_insert.data[0]
            else:
                pg_info = pg_res.data[0]

            # 2. Get Rooms
            rooms_res = supabase.from_("rooms").select("*").eq("pg_id", pg_info["id"]).execute()
            rooms = rooms_res.data
            
            # Lazy initialize rooms if database is completely empty for this PG
            if len(rooms) == 0:
                sharing_types = ["single", "double", "triple", "four"]
                prices = {"single": 10000, "double": 8000, "triple": 6500, "four": 5000}
                new_rooms = []
                for floor in range(1, (pg_info.get("total_floors") or 3) + 1):
                    for room in range(1, 5):
                        room_number = floor * 100 + room
                        sharing = sharing_types[(room - 1) % len(sharing_types)]
                        rent = pg_info["rent"] if sharing == "double" else prices[sharing]
                        new_rooms.append({
                            "pg_id": pg_info["id"],
                            "room_number": room_number,
                            "floor": floor,
                            "sharing": sharing,
                            "rent": rent,
                            "status": "available",
                            "has_attached_bathroom": room <= 2,
                            "is_ac": room == 1 or room == 4,
                            "has_balcony": room == 4
                        })
                supabase.from_("rooms").insert(new_rooms).execute()
                rooms_res = supabase.from_("rooms").select("*").eq("pg_id", pg_info["id"]).execute()
                rooms = rooms_res.data

            # 3. Get Bookings
            bookings_res = supabase.from_("bookings").select("*").eq("pg_id", pg_info["id"]).execute()
            bookings = bookings_res.data

            return {
                "pg": pg_info,
                "rooms": rooms,
                "bookings": bookings
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        # Find PG Info
        pg_matched = [p for p in db["pg_listings"] if p["name"].lower() == pg_name.lower()]
        if not pg_matched:
            new_id = max([p["id"] for p in db["pg_listings"]]) + 1 if db["pg_listings"] else 1
            pg_info = {
                "id": new_id,
                "name": pg_name,
                "location": "Marathahalli",
                "gender": "Any",
                "rent": 8500,
                "rating": 5.0,
                "distance": "0.5 km",
                "amenities": ["WiFi", "Food"],
                "total_floors": 3,
                "image": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80"
            }
            db["pg_listings"].append(pg_info)
            write_mock_db(db)
        else:
            pg_info = pg_matched[0]

        # Find Rooms
        rooms = [r for r in db["rooms"] if r["pg_id"] == pg_info["id"]]
        if not rooms:
            # Recreate rooms in mock DB
            sharing_types = ["single", "double", "triple", "four"]
            prices = {"single": 10000, "double": 8000, "triple": 6500, "four": 5000}
            rooms_to_add = []
            room_id_counter = max([r["id"] for r in db["rooms"]]) + 1 if db["rooms"] else 1
            for floor in range(1, pg_info["total_floors"] + 1):
                for room in range(1, 5):
                    room_number = floor * 100 + room
                    sharing = sharing_types[(room - 1) % len(sharing_types)]
                    rent = pg_info["rent"] if sharing == "double" else prices[sharing]
                    rooms_to_add.append({
                        "id": room_id_counter,
                        "pg_id": pg_info["id"],
                        "room_number": room_number,
                        "floor": floor,
                        "sharing": sharing,
                        "rent": rent,
                        "status": "available",
                        "has_attached_bathroom": room <= 2,
                        "is_ac": room == 1 or room == 4,
                        "has_balcony": room == 4
                    })
                    room_id_counter += 1
            db["rooms"].extend(rooms_to_add)
            write_mock_db(db)
            rooms = rooms_to_add

        # Find Bookings
        bookings = [b for b in db["bookings"] if b.get("pgId") == pg_info["id"] or b.get("pg_id") == pg_info["id"]]

        return {
            "pg": pg_info,
            "rooms": rooms,
            "bookings": bookings
        }

@app.put("/api/owner/pg")
def update_owner_pg(req: PGUpdateRequest, pg_name: str = Depends(get_current_owner)):
    if supabase:
        try:
            # Find PG listing ID
            pg_res = supabase.from_("pg_listings").select("id").eq("name", pg_name).execute()
            if len(pg_res.data) == 0:
                raise HTTPException(status_code=404, detail="PG listing not found.")
            
            pg_id = pg_res.data[0]["id"]
            update_data = {
                "location": req.location,
                "gender": req.gender,
                "rent": req.rent,
                "amenities": req.amenities
            }
            if req.image:
                update_data["image"] = req.image
                
            res = supabase.from_("pg_listings").update(update_data).eq("id", pg_id).execute()
            return {"message": "PG details updated successfully", "data": res.data[0]}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        matched = [p for p in db["pg_listings"] if p["name"].lower() == pg_name.lower()]
        if not matched:
            raise HTTPException(status_code=404, detail="PG listing not found.")
        
        pg = matched[0]
        pg["location"] = req.location
        pg["gender"] = req.gender
        pg["rent"] = req.rent
        pg["amenities"] = req.amenities
        if req.image:
            pg["image"] = req.image
            
        write_mock_db(db)
        return {"message": "PG details updated successfully (Mock DB)", "data": pg}

@app.post("/api/owner/rooms")
def add_owner_room(req: RoomCreateRequest, pg_name: str = Depends(get_current_owner)):
    if supabase:
        try:
            pg_res = supabase.from_("pg_listings").select("id").eq("name", pg_name).execute()
            pg_id = pg_res.data[0]["id"]
            
            # Check unique room number
            existing = supabase.from_("rooms").select("id").eq("pg_id", pg_id).eq("room_number", req.room_number).execute()
            if len(existing.data) > 0:
                raise HTTPException(status_code=400, detail=f"Room {req.room_number} already exists.")
                
            res = supabase.from_("rooms").insert([{
                "pg_id": pg_id,
                "room_number": req.room_number,
                "floor": req.floor,
                "sharing": req.sharing,
                "rent": req.rent,
                "status": req.status,
                "has_attached_bathroom": req.has_attached_bathroom,
                "is_ac": req.is_ac,
                "has_balcony": req.has_balcony
            }]).execute()
            return {"message": "Room added successfully", "data": res.data[0]}
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        pg = [p for p in db["pg_listings"] if p["name"].lower() == pg_name.lower()][0]
        
        if any(r["pg_id"] == pg["id"] and r["room_number"] == req.room_number for r in db["rooms"]):
            raise HTTPException(status_code=400, detail=f"Room {req.room_number} already exists.")
            
        new_id = max([r["id"] for r in db["rooms"]]) + 1 if db["rooms"] else 1
        new_room = {
            "id": new_id,
            "pg_id": pg["id"],
            "room_number": req.room_number,
            "floor": req.floor,
            "sharing": req.sharing,
            "rent": req.rent,
            "status": req.status,
            "has_attached_bathroom": req.has_attached_bathroom,
            "is_ac": req.is_ac,
            "has_balcony": req.has_balcony
        }
        db["rooms"].append(new_room)
        write_mock_db(db)
        return {"message": "Room added successfully (Mock DB)", "data": new_room}

@app.put("/api/owner/rooms/{room_number}")
def update_owner_room(room_number: int, req: RoomCreateRequest, pg_name: str = Depends(get_current_owner)):
    if supabase:
        try:
            pg_res = supabase.from_("pg_listings").select("id").eq("name", pg_name).execute()
            pg_id = pg_res.data[0]["id"]
            
            res = supabase.from_("rooms").update({
                "sharing": req.sharing,
                "rent": req.rent,
                "status": req.status,
                "has_attached_bathroom": req.has_attached_bathroom,
                "is_ac": req.is_ac,
                "has_balcony": req.has_balcony
            }).eq("pg_id", pg_id).eq("room_number", room_number).execute()
            
            if len(res.data) == 0:
                raise HTTPException(status_code=404, detail="Room not found.")
            return {"message": "Room updated successfully", "data": res.data[0]}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        pg = [p for p in db["pg_listings"] if p["name"].lower() == pg_name.lower()][0]
        matched = [r for r in db["rooms"] if r["pg_id"] == pg["id"] and r["room_number"] == room_number]
        if not matched:
            raise HTTPException(status_code=404, detail="Room not found.")
        
        room = matched[0]
        room["sharing"] = req.sharing
        room["rent"] = req.rent
        room["status"] = req.status
        room["has_attached_bathroom"] = req.has_attached_bathroom
        room["is_ac"] = req.is_ac
        room["has_balcony"] = req.has_balcony
        
        write_mock_db(db)
        return {"message": "Room updated successfully (Mock DB)", "data": room}

@app.delete("/api/owner/rooms/{room_number}")
def delete_owner_room(room_number: int, pg_name: str = Depends(get_current_owner)):
    if supabase:
        try:
            pg_res = supabase.from_("pg_listings").select("id").eq("name", pg_name).execute()
            pg_id = pg_res.data[0]["id"]
            
            res = supabase.from_("rooms").delete().eq("pg_id", pg_id).eq("room_number", room_number).execute()
            if len(res.data) == 0:
                raise HTTPException(status_code=404, detail="Room not found.")
            return {"message": "Room deleted successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        pg = [p for p in db["pg_listings"] if p["name"].lower() == pg_name.lower()][0]
        
        room_len = len(db["rooms"])
        db["rooms"] = [r for r in db["rooms"] if not (r["pg_id"] == pg["id"] and r["room_number"] == room_number)]
        
        if len(db["rooms"]) == room_len:
            raise HTTPException(status_code=404, detail="Room not found.")
            
        write_mock_db(db)
        return {"message": "Room deleted successfully (Mock DB)"}

@app.put("/api/owner/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, req: BookingStatusUpdateRequest, pg_name: str = Depends(get_current_owner)):
    if supabase:
        try:
            # Security check: verify booking belongs to this owner's PG
            pg_res = supabase.from_("pg_listings").select("id").eq("name", pg_name).execute()
            pg_id = pg_res.data[0]["id"]
            
            booking = supabase.from_("bookings").select("id", "pg_id", "room_number").eq("id", booking_id).execute()
            if len(booking.data) == 0:
                raise HTTPException(status_code=404, detail="Booking request not found.")
                
            if booking.data[0]["pg_id"] != pg_id:
                raise HTTPException(status_code=403, detail="Unauthorized access to this booking request.")
                
            res = supabase.from_("bookings").update({"status": req.status}).eq("id", booking_id).execute()
            
            # If approved, automatically update corresponding room status to 'booked'
            if req.status == "confirmed" and booking.data[0]["room_number"]:
                supabase.from_("rooms").update({"status": "booked"}).eq("pg_id", pg_id).eq("room_number", booking.data[0]["room_number"]).execute()
            
            return {"message": f"Booking request {req.status} successfully", "data": res.data[0]}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        pg = [p for p in db["pg_listings"] if p["name"].lower() == pg_name.lower()][0]
        
        # In mock db, booking id is string, but let's check for match by str or int
        matched = [b for b in db["bookings"] if str(b.get("id")) == str(booking_id)]
        if not matched:
            raise HTTPException(status_code=404, detail="Booking request not found.")
            
        booking = matched[0]
        booking_pg_id = booking.get("pgId") or booking.get("pg_id")
        if booking_pg_id != pg["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized access.")
            
        booking["status"] = req.status
        
        # Auto update room status
        if req.status == "confirmed" and booking.get("roomNumber"):
            for r in db["rooms"]:
                if r["pg_id"] == pg["id"] and r["room_number"] == booking.get("roomNumber"):
                    r["status"] = "booked"
                    
        write_mock_db(db)
        return {"message": f"Booking request {req.status} successfully (Mock DB)", "data": booking}

@app.post("/api/owner/change-password")
def change_owner_password(req: ChangePasswordRequest, pg_name: str = Depends(get_current_owner)):
    if supabase:
        try:
            res = supabase.from_("owners").select("*").eq("pg_name", pg_name).execute()
            owner = res.data[0]
            
            if not verify_password(req.old_password, owner["password_hash"]):
                raise HTTPException(status_code=400, detail="Invalid old password.")
                
            new_hash = hash_password(req.new_password)
            supabase.from_("owners").update({"password_hash": new_hash}).eq("id", owner["id"]).execute()
            return {"message": "Password changed successfully"}
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        db = read_mock_db()
        owner = [o for o in db["owners"] if o["pg_name"].lower() == pg_name.lower()][0]
        
        if not verify_password(req.old_password, owner["password_hash"]):
            raise HTTPException(status_code=400, detail="Invalid old password.")
            
        owner["password_hash"] = hash_password(req.new_password)
        write_mock_db(db)
        return {"message": "Password changed successfully (Mock DB)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
