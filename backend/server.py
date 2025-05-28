from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import gpxpy
import gpxpy.gpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic models for GPX generation
class CoordinatePoint(BaseModel):
    lat: float
    lng: float

class RunDetails(BaseModel):
    name: str
    date: str  # YYYY-MM-DD format
    startTime: str  # HH:MM format
    description: Optional[str] = ""
    avgPace: float  # minutes per km
    distance: float
    duration: int  # seconds
    elevationGain: int
    activityType: str  # 'run' or 'bike'

class GPXGenerationRequest(BaseModel):
    route: List[List[float]]  # List of [lat, lng] pairs
    runDetails: RunDetails

def generate_gpx_content(route_coordinates: List[List[float]], run_details: RunDetails) -> str:
    """
    Generate GPX content from route coordinates and run details
    """
    # Create new GPX file
    gpx = gpxpy.gpx.GPX()
    
    # Add metadata
    gpx.name = run_details.name
    gpx.description = run_details.description
    gpx.creator = "FakeMyRun"
    
    # Create track
    gpx_track = gpxpy.gpx.GPXTrack()
    gpx_track.name = run_details.name
    gpx_track.description = run_details.description
    gpx.tracks.append(gpx_track)
    
    # Create track segment
    gpx_segment = gpxpy.gpx.GPXTrackSegment()
    gpx_track.segments.append(gpx_segment)
    
    # Parse start date and time
    start_date = datetime.strptime(run_details.date, "%Y-%m-%d")
    start_time_parts = run_details.startTime.split(":")
    start_datetime = start_date.replace(
        hour=int(start_time_parts[0]),
        minute=int(start_time_parts[1]),
        second=0
    )
    
    # Calculate time between points based on pace and distance
    total_points = len(route_coordinates)
    total_duration_seconds = run_details.duration
    time_per_point = total_duration_seconds / max(1, total_points - 1) if total_points > 1 else 0
    
    # Add route points with timestamps and elevation
    current_time = start_datetime
    base_elevation = 100  # Starting elevation in meters
    
    for i, coord in enumerate(route_coordinates):
        lat, lng = coord[0], coord[1]
        
        # Calculate simulated elevation gain based on position in route
        elevation_variation = (run_details.elevationGain * i / max(1, total_points - 1)) if total_points > 1 else 0
        # Add some natural variation
        elevation_noise = (i % 10 - 5) * 2  # Small variations
        elevation = base_elevation + elevation_variation + elevation_noise
        
        # Create GPX point
        gpx_point = gpxpy.gpx.GPXTrackPoint(
            latitude=lat,
            longitude=lng,
            elevation=elevation,
            time=current_time
        )
        
        gpx_segment.points.append(gpx_point)
        
        # Move to next timestamp
        current_time += timedelta(seconds=time_per_point)
    
    return gpx.to_xml()

@app.post("/api/generate-gpx")
async def generate_gpx_endpoint(request: GPXGenerationRequest):
    """
    Generate and return GPX file from route coordinates and run details
    """
    try:
        if not request.route or len(request.route) < 2:
            raise HTTPException(status_code=400, detail="Route must contain at least 2 points")
        
        # Generate GPX content
        gpx_content = generate_gpx_content(request.route, request.runDetails)
        
        # Create filename
        safe_name = "".join(c for c in request.runDetails.name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_')
        filename = f"{safe_name}_{request.runDetails.date}.gpx"
        
        # Return GPX file
        return Response(
            content=gpx_content,
            media_type="application/gpx+xml",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Error generating GPX: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating GPX file: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
