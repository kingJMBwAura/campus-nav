step 1. turn on virtual environment
  source venv/bin/activate

step 2. go to backend and run app
  cd backend
  python app.py

step 3. locate frontend/index.html and run it through a browser

--- deliverables ---

Sophie:
- finish location latitude and longitudes of remaining locations in campus_graph.json

how to do this:
1. go to google maps
2. right click the building/location
3. copy paste the longitude (e.g., 14.64117) and longitude (e.g., 121.07486) into the respective location's dictionary
4. (optional) if you can start learning/fixing adjacency that'd be great!

Remaining steps:
- revise adjacency (or paths) between buildings
    issue that might come up is that paths are not accurate (e.g., tumatagos yung path through a building or road).
- revise algorithms (if needed) to follow the format used in assignments

modules to download if not installed:
uvicorn (pip install uvicorn)
fastapi (pip install fastapi)

test