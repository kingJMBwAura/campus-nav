import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import unquote

# custom modules
from graph import CampusGraph
from dijkstra import find_shortest_path

app = FastAPI()

# Enable CORS so frontend (port 5500/etc) can talk to backend (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Graph Data
campus = CampusGraph()

# --- Data Models ---
class RouteRequest(BaseModel):
    start_id: str
    end_id: str

# --- API Endpoints ---
@app.get("/")
def home():
    return {"message": "Ateneo Campus Nav API is running"}

@app.get("/buildings")
def get_buildings():
    """Returns sorted list of buildings for the dropdowns (Quick Sort)."""
    return campus.get_all_buildings()

@app.get("/search/{name}")
def search_building(name: str):
    """
    Demonstrates Binary Search: Finds a building by name.
    """
    decoded_name = unquote(name)
    result = campus.get_building_by_name(decoded_name)
    
    if result:
        return result
    return {"error": "Building not found"}

@app.post("/calculate-route")
def calculate_route(request: RouteRequest):
    path_ids, distance = find_shortest_path(campus.adjacency, request.start_id, request.end_id)
    
    if distance == float('inf'):
        return {"error": "No path found"}

    path_details = []
    for pid in path_ids:
        b = campus.buildings.get(pid)
        path_details.append({
            "id": pid,
            "name": b['name'],
            "lat": b['lat'],
            "lng": b['lng']
        })

    return {
        "distance_meters": distance,
        "estimated_time_minutes": round(distance / 80, 1),
        "path": path_details
    }

if __name__ == '__main__':
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)