from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import sqlite3
import os
import json
import logging
from pathlib import Path
from typing import List, Optional
from passlib.context import CryptContext
import jwt
import uuid
from datetime import datetime, timedelta
import uvicorn

# Get the directory where this script is located
ROOT_DIR = Path(__file__).parent

# SQLite database path
DB_PATH = ROOT_DIR / 'fakerun.db'

# Add these constants after the existing imports
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    return conn

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic models
class StatusCheck(BaseModel):
    id: str
    timestamp: str
    status: str
    message: str

from typing import Optional
import gpxpy
import gpxpy.gpx

class RunDetails(BaseModel):
    distance: float
    duration: int
    pace: str
    calories: int
    route_name: str
    elevation_gain: Optional[int] = 0
    activity_type: Optional[str] = 'run'
    name: Optional[str] = 'Morning Run'
    date: Optional[str] = None
    start_time: Optional[str] = '08:00'
    description: Optional[str] = ''

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class RouteData(BaseModel):
    coordinates: List[List[float]]
    runDetails: RunDetails

class SavedRoute(BaseModel):
    id: str
    name: str
    coordinates: List[List[float]]
    run_details: RunDetails
    created_at: datetime
    user_id: str

# Authentication helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(email: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    return User(
        id=user['id'],
        email=user['email'],
        username=user['username'],
        created_at=datetime.fromisoformat(user['created_at']),
        is_active=bool(user['is_active'])
    )

# Basic endpoints
@api_router.get("/")
async def root():
    return {"message": "FakeRun API is running!"}

@api_router.get("/status")
async def get_status():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM status_checks ORDER BY timestamp DESC LIMIT 10")
        status_checks = []
        for row in cursor.fetchall():
            status_checks.append({
                "id": row["id"],
                "timestamp": row["timestamp"],
                "status": row["status"],
                "message": row["message"]
            })
        conn.close()
        return status_checks
    except Exception as e:
        logger.error(f"Error fetching status checks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching status checks: {str(e)}")

# GPX parsing function
def parse_gpx_file(gpx_file_content: str) -> dict:
    """
    Parses GPX file content and extracts latitude and longitude from each track point,
    as well as basic metadata (route name).

    Args:
        gpx_file_content: GPX file content as a string.

    Returns:
        A dictionary containing "coordinates" (list of [lat, lon] pairs)
        and "name" (string, optional route name).
        Returns {"coordinates": [], "name": None} if parsing fails or no points are found.
    """
    coordinates = []
    route_name = None
    try:
        gpx = gpxpy.parse(gpx_file_content)

        # Try to get route name from metadata
        if gpx.metadata and gpx.metadata.name:
            route_name = gpx.metadata.name
        elif gpx.tracks:
            # If not in metadata, try the first track's name
            for track in gpx.tracks:
                if track.name:
                    route_name = track.name
                    break

        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    coordinates.append([point.latitude, point.longitude])
    except Exception as e:
        logger.error(f"Error parsing GPX file: {e}") # Use logger for errors
        return {"coordinates": [], "name": None}

    return {"coordinates": coordinates, "name": route_name}

# GPX generation endpoint
def generate_gpx_content(route_coordinates: List[List[float]], run_details: RunDetails) -> str:
    gpx_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FakeRun" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>{run_details.route_name}</name>
    <desc>Generated route with distance: {run_details.distance}km, duration: {run_details.duration}min</desc>
  </metadata>
  <trk>
    <name>{run_details.route_name}</name>
    <trkseg>
'''
    
    for coord in route_coordinates:
        lat, lng = coord[0], coord[1]
        gpx_content += f'      <trkpt lat="{lat}" lon="{lng}"></trkpt>\n'
    
    gpx_content += '''    </trkseg>
  </trk>
</gpx>'''
    
    return gpx_content

@api_router.post("/generate-gpx")
async def generate_gpx_endpoint(route_data: RouteData):
    try:
        gpx_content = generate_gpx_content(route_data.coordinates, route_data.runDetails)
        return {"gpx_content": gpx_content}
    except Exception as e:
        logger.error(f"Error generating GPX: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating GPX: {str(e)}")

# Authentication endpoints
@api_router.post("/auth/register", response_model=Token)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        # Check if username already exists
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
        
        # Create new user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(user_data.password)
        created_at = datetime.utcnow().isoformat()
        
        cursor.execute(
            "INSERT INTO users (id, email, username, hashed_password, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, user_data.email, user_data.username, hashed_password, created_at, True)
        )
        
        conn.commit()
        conn.close()
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_id}, expires_delta=access_token_expires
        )
        
        user = User(
            id=user_id,
            email=user_data.email,
            username=user_data.username,
            created_at=datetime.fromisoformat(created_at),
            is_active=True
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error registering user: {str(e)}")

@api_router.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    """Login user"""
    try:
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (user_data.email,))
        user_record = cursor.fetchone()
        conn.close()
        
        if not user_record or not verify_password(user_data.password, user_record['hashed_password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_record['id']}, expires_delta=access_token_expires
        )
        
        user = User(
            id=user_record['id'],
            email=user_record['email'],
            username=user_record['username'],
            created_at=datetime.fromisoformat(user_record['created_at']),
            is_active=bool(user_record['is_active'])
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error logging in user: {str(e)}")

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@api_router.post("/upload-gpx")
async def upload_gpx_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """
    Uploads a GPX file, parses it, and returns the coordinates.
    """
    if not file.filename.endswith(".gpx"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only GPX files are allowed.")

    try:
        contents = await file.read()
        gpx_content_str = contents.decode("utf-8")
    except Exception as e:
        logger.error(f"Error reading or decoding GPX file: {e}")
        raise HTTPException(status_code=400, detail=f"Error reading or decoding GPX file: {e}")
    finally:
        await file.close()

    parsed_data = parse_gpx_file(gpx_content_str)
    coordinates = parsed_data.get("coordinates")
    route_name = parsed_data.get("name")

    if not coordinates: # Check if coordinates list is empty or None
        raise HTTPException(status_code=400, detail="Could not parse GPX file or no track points found.")

    response_data = {"coordinates": coordinates}
    if route_name:
        response_data["name"] = route_name

    return response_data

# Route management endpoints
@api_router.post("/routes")
async def save_route(route_data: RouteData, overwrite: bool = False, current_user: User = Depends(get_current_user)):
    """Save a route for the current user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        route_name = route_data.runDetails.route_name
        
        if overwrite:
            # Check if route with same name exists for this user
            cursor.execute(
                "SELECT id FROM saved_routes WHERE name = ? AND user_id = ?",
                (route_name, current_user.id)
            )
            existing_route = cursor.fetchone()
            
            if existing_route:
                # Update existing route
                cursor.execute(
                    "UPDATE saved_routes SET coordinates = ?, run_details = ?, created_at = ? WHERE name = ? AND user_id = ?",
                    (
                        json.dumps(route_data.coordinates),
                        json.dumps(route_data.runDetails.dict()),
                        datetime.utcnow().isoformat(),
                        route_name,
                        current_user.id
                    )
                )
                conn.commit()
                conn.close()
                return {"message": "Route updated successfully", "route_id": existing_route['id']}
        
        # Insert new route (either no overwrite requested or no existing route found)
        route_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        
        cursor.execute(
            "INSERT INTO saved_routes (id, name, coordinates, run_details, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?)",
            (
                route_id,
                route_name,
                json.dumps(route_data.coordinates),
                json.dumps(route_data.runDetails.dict()),
                created_at,
                current_user.id
            )
        )
        
        conn.commit()
        conn.close()
        
        return {"message": "Route saved successfully", "route_id": route_id}
        
    except Exception as e:
        logger.error(f"Error saving route: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving route: {str(e)}")

@api_router.get("/routes", response_model=List[SavedRoute])
async def get_saved_routes(current_user: User = Depends(get_current_user)):
    """Get all saved routes for the current user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM saved_routes WHERE user_id = ? ORDER BY created_at DESC",
            (current_user.id,)
        )
        
        routes = []
        for row in cursor.fetchall():
            routes.append(SavedRoute(
                id=row['id'],
                name=row['name'],
                coordinates=json.loads(row['coordinates']),
                run_details=RunDetails(**json.loads(row['run_details'])),
                created_at=datetime.fromisoformat(row['created_at']),
                user_id=row['user_id']
            ))
        
        conn.close()
        return routes
        
    except Exception as e:
        logger.error(f"Error fetching routes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching routes: {str(e)}")

@api_router.get("/routes/{route_id}", response_model=SavedRoute)
async def get_route_by_id(route_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific route by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM saved_routes WHERE id = ? AND user_id = ?",
            (route_id, current_user.id)
        )
        
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Route not found")
        
        route = SavedRoute(
            id=row['id'],
            name=row['name'],
            coordinates=json.loads(row['coordinates']),
            run_details=RunDetails(**json.loads(row['run_details'])),
            created_at=datetime.fromisoformat(row['created_at']),
            user_id=row['user_id']
        )
        
        conn.close()
        return route
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching route: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching route: {str(e)}")

@api_router.delete("/routes/{route_id}")
async def delete_route(route_id: str, current_user: User = Depends(get_current_user)):
    """Delete a specific route"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if route exists and belongs to user
        cursor.execute(
            "SELECT id FROM saved_routes WHERE id = ? AND user_id = ?",
            (route_id, current_user.id)
        )
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Route not found")
        
        # Delete the route
        cursor.execute(
            "DELETE FROM saved_routes WHERE id = ? AND user_id = ?",
            (route_id, current_user.id)
        )
        
        conn.commit()
        conn.close()
        
        return {"message": "Route deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting route: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting route: {str(e)}")

# Database initialization
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_database()
    logger.info("Application started with SQLite database")

def init_database():
    """Initialize the SQLite database with required tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create status_checks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS status_checks (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL,
            message TEXT NOT NULL
        )
    ''')
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE
        )
    ''')
    
    # Create saved_routes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS saved_routes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            coordinates TEXT NOT NULL,
            run_details TEXT NOT NULL,
            created_at TEXT NOT NULL,
            user_id TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
