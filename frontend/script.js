document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const API_URL = "http://localhost:8000";

    // --- Map Initialization ---
    const map = L.map('map').setView([14.639, 121.078], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 15,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    let routePolyline = null;
    let markers = {};

    // --- Verify Building using Binary Search API ---
    async function verifyBuilding(name) {
        if (!name) return null;
        try {
            const res = await fetch(`${API_URL}/search/${encodeURIComponent(name)}`);
            const data = await res.json();
            if (data.error) return null;
            return data;
        } catch (e) {
            console.error("Verification failed", e);
            return null;
        }
    }

    // --- Fetch Buildings & Create Markers ---
    async function loadBuildings() {
        try {
            const res = await fetch(`${API_URL}/buildings`);
            const buildings = await res.json();
            
            const dataList = document.getElementById('buildings-list');
            dataList.innerHTML = '';

            buildings.forEach(b => {
                // Populate Search Datalist
                const option = document.createElement('option');
                option.value = b.name;
                dataList.appendChild(option);

                const iconHtml = `
                    <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md hover:bg-blue-700 transition-colors"></div>
                `;
                
                const icon = L.divIcon({ 
                    className: 'custom-marker',
                    html: iconHtml, 
                    iconSize: [16, 16],
                    iconAnchor: [8, 8], // Center the icon
                    popupAnchor: [0, -10]
                });
                
                // 2. Add to Map
                const marker = L.marker([b.lat, b.lng], { icon })
                    .bindPopup(`<b>${b.name}</b>`)
                    .addTo(map);
                
                // 3. Store reference for hiding/showing later
                markers[b.id] = marker;
            });

        } catch (err) {
            console.error("Error loading buildings:", err);
            document.getElementById('error').textContent = "Could not connect to backend API.";
            document.getElementById('error').classList.remove('hidden');
        }
    }

    loadBuildings();

    // --- Toggle Marker Visibility ---
    // If pathIds is null, show everything.
    // If pathIds is an array, only show markers matching those IDs.
    function updateMapVisibility(pathIds = null) {
        for (const [id, marker] of Object.entries(markers)) {
            if (pathIds === null) {
                if (!map.hasLayer(marker)) marker.addTo(map);
                marker.setOpacity(1);
            } else {
                if (pathIds.includes(id)) {
                    if (!map.hasLayer(marker)) marker.addTo(map);
                    marker.setOpacity(1);
                } else {
                    map.removeLayer(marker);
                    
                }
            }
        }
    }

    // --- Calculate Route Handler ---
    document.getElementById('find-route-btn').addEventListener('click', async () => {
        const startName = document.getElementById('start-input').value.trim();
        const endName = document.getElementById('end-input').value.trim();

        // UI Reset
        const errorDiv = document.getElementById('error');
        const loadingDiv = document.getElementById('loading');
        const resultsDiv = document.getElementById('results');
        
        errorDiv.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        
        if (routePolyline) map.removeLayer(routePolyline);
        
        // Reset map to show all buildings briefly before filtering
        updateMapVisibility(null);

        if (!startName || !endName) {
            loadingDiv.classList.add('hidden');
            errorDiv.textContent = "Please enter both a start and destination.";
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            // 1. Verify Locations (Binary Search)
            const [startObj, endObj] = await Promise.all([
                verifyBuilding(startName),
                verifyBuilding(endName)
            ]);

            if (!startObj) throw new Error(`Could not find: "${startName}"`);
            if (!endObj) throw new Error(`Could not find: "${endName}"`);
            if (startObj.id === endObj.id) throw new Error("Start and Destination are the same.");

            // 2. Calculate Path (Dijkstra)
            const res = await fetch(`${API_URL}/calculate-route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_id: startObj.id, end_id: endObj.id })
            });

            const data = await res.json();
            loadingDiv.classList.add('hidden');

            if (data.error) throw new Error(data.error);

            // 3. Draw Route
            const latlngs = data.path.map(p => [p.lat, p.lng]);
            routePolyline = L.polyline(latlngs, { color: '#2563eb', weight: 6, opacity: 0.9 }).addTo(map);
            map.fitBounds(routePolyline.getBounds().pad(0.4)); // Zoom to fit path

            // 4. HIDE INACTIVE NODES
            // Extract the list of IDs in the path
            const pathIds = data.path.map(p => p.id);
            updateMapVisibility(pathIds);

            // 5. Show Results Stats
            document.getElementById('dist-val').textContent = `${Math.round(data.distance_meters)} m`;
            document.getElementById('time-val').textContent = `${data.estimated_time_minutes} min`;
            
            const list = document.getElementById('path-list');
            list.innerHTML = data.path.map((p, i) => `
                <li class="flex items-center gap-2">
                    <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">${i+1}</span>
                    <span>${p.name}</span>
                </li>
            `).join('');
            
            resultsDiv.classList.remove('hidden');

        } catch (err) {
            console.error(err);
            loadingDiv.classList.add('hidden');
            errorDiv.textContent = err.message;
            errorDiv.classList.remove('hidden');
            // Ensure map shows everything if error occurs
            updateMapVisibility(null);
        }
    });
    
    // Reset map visibility when user clears search or clicks map
    map.on('click', () => {
        if (!routePolyline) { // Only if no active route
             updateMapVisibility(null);
        }
    });
});