document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const API_URL = "http://localhost:8000";

    // --- Map Initialization ---
    const map = L.map('map').setView([14.638, 121.077], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    let routePolyline = null;
    let markers = {};

    // --- Helper: Verify Building using Binary Search API ---
    // This is the key "search" feature. It calls the backend to find ID by Name.
    async function verifyBuilding(name) {
        if (!name) return null;
        try {
            const res = await fetch(`${API_URL}/search/${encodeURIComponent(name)}`);
            const data = await res.json();
            if (data.error) return null; // Not found
            return data; // Returns object {id: "XAV", name: "Xavier Hall", ...}
        } catch (e) {
            console.error("Verification failed", e);
            return null;
        }
    }

    // --- Fetch Buildings for Datalist (Quick Sort) ---
    async function loadBuildings() {
        try {
            const res = await fetch(`${API_URL}/buildings`);
            const buildings = await res.json();
            
            const dataList = document.getElementById('buildings-list');
            dataList.innerHTML = ''; // Clear existing

            buildings.forEach(b => {
                // Populate Datalist Options
                const option = document.createElement('option');
                option.value = b.name; // Display Name in dropdown
                dataList.appendChild(option);

                // Add Markers to Map (Visual reference)
                const iconHtml = `<div class="bg-blue-600 text-white font-bold text-xs p-1 rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-md">${b.id}</div>`;
                const icon = L.divIcon({ className: 'custom-div-icon', html: iconHtml, iconSize: [24, 24] });
                
                markers[b.id] = L.marker([b.lat, b.lng], { icon }).bindPopup(b.name).addTo(map);
            });

        } catch (err) {
            console.error("Error loading buildings:", err);
            document.getElementById('error').textContent = "Could not connect to backend API.";
            document.getElementById('error').classList.remove('hidden');
        }
    }

    loadBuildings();

    // --- Calculate Route Handler ---
    document.getElementById('find-route-btn').addEventListener('click', async () => {
        // 1. Get Text Input
        const startName = document.getElementById('start-input').value.trim();
        const endName = document.getElementById('end-input').value.trim();

        // 2. UI Reset
        const errorDiv = document.getElementById('error');
        const loadingDiv = document.getElementById('loading');
        const resultsDiv = document.getElementById('results');
        
        errorDiv.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        
        if (routePolyline) map.removeLayer(routePolyline);

        if (!startName || !endName) {
            loadingDiv.classList.add('hidden');
            errorDiv.textContent = "Please enter both a start and destination.";
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            // 3. VERIFY LOCATIONS (Uses Backend Binary Search)
            // We must resolve the Name "Xavier Hall" -> ID "XAV" using the backend
            const [startObj, endObj] = await Promise.all([
                verifyBuilding(startName),
                verifyBuilding(endName)
            ]);

            if (!startObj) {
                throw new Error(`Could not find building: "${startName}"`);
            }
            if (!endObj) {
                throw new Error(`Could not find building: "${endName}"`);
            }
            if (startObj.id === endObj.id) {
                throw new Error("Start and Destination cannot be the same.");
            }

            // 4. CALCULATE PATH (Uses Backend Dijkstra)
            const res = await fetch(`${API_URL}/calculate-route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_id: startObj.id, end_id: endObj.id })
            });

            const data = await res.json();
            loadingDiv.classList.add('hidden');

            if (data.error) {
                throw new Error(data.error);
            }

            // 5. Draw Route & Show Results
            const latlngs = data.path.map(p => [p.lat, p.lng]);
            routePolyline = L.polyline(latlngs, { color: '#2563eb', weight: 6 }).addTo(map);
            map.fitBounds(routePolyline.getBounds().pad(0.2));

            document.getElementById('dist-val').textContent = `${Math.round(data.distance_meters)} m`;
            document.getElementById('time-val').textContent = `${data.estimated_time_minutes} min`;
            
            const list = document.getElementById('path-list');
            list.innerHTML = data.path.map((p, i) => `<li>${i+1}. ${p.name}</li>`).join('');
            
            resultsDiv.classList.remove('hidden');

        } catch (err) {
            console.error(err);
            loadingDiv.classList.add('hidden');
            errorDiv.textContent = err.message;
            errorDiv.classList.remove('hidden');
        }
    });
});