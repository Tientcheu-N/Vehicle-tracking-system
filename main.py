from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Dict, Optional, Tuple, Any
from services.api import getSystemStatus, getStats, getTrafficData
import heapq
import uvicorn
from datetime import datetime, timedelta
from pydantic import BaseModel
import json
from math import radians, sin, cos, sqrt, atan2
import os
import random
import uuid
import threading
import time
import asyncio
from collections import defaultdict

app = FastAPI(
    title="Smart Transit Cameroon",
    description="Système de transport intelligent pour le Cameroun avec simulations temps réel",
    version="4.0.0"
)

# Configuration CORS pour React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001", 
    
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Créer le dossier static s'il n'existe pas
os.makedirs("static", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Créer un favicon simple s'il n'existe pas
favicon_path = "static/favicon.ico"
if not os.path.exists(favicon_path):
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (32, 32), color='#007a5e')
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 10, 32, 22], fill='#ce1126')
        points = [
            (16, 6), (19, 12), (26, 12), (21, 16),
            (23, 22), (16, 18), (9, 22), (11, 16),
            (6, 12), (13, 12)
        ]
        draw.polygon(points, fill='#fcd116')
        img.save(favicon_path, format='ICO')
        print("✅ Favicon créé avec succès")
    except ImportError:
        with open(favicon_path, 'wb') as f:
            f.write(b'')
        print("⚠️  PIL non installé, favicon vide créé")

# Favicon endpoint
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    return {}

# --- STRUCTURES POUR LE SUIVI DES SIMULATIONS EN TEMPS RÉEL ---

# Stockage des simulations en cours
active_simulations = {}
# Historique des simulations
simulation_history = []
# Connexions WebSocket pour les mises à jour en temps réel
active_connections = []
# Connexions par simulation
simulation_connections = defaultdict(list)

# Modèles Pydantic
class RouteRequest(BaseModel):
    start: str
    end: str
    hour: int = 12
    preferences: Optional[Dict] = None

class TrafficUpdate(BaseModel):
    hour: int
    delay: int

class DriverRegistration(BaseModel):
    driver_id: str
    vehicle_type: str
    capacity: int

class SimulationRequest(BaseModel):
    start_city: str
    end_city: str
    vehicle_type: str
    departure_hour: int

class SimulationControl(BaseModel):
    action: str

class SimulationUpdate(BaseModel):
    progress: float = 0.0
    distance_traveled: float = 0.0
    current_position: Optional[Dict] = None
    status: Optional[str] = None

# --- WEB SOCKET MANAGER POUR LES MISE À JOUR EN TEMPS RÉEL ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.simulation_connections = defaultdict(list)

    async def connect(self, websocket: WebSocket, simulation_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if simulation_id:
            self.simulation_connections[simulation_id].append(websocket)
        print(f"🔌 Nouvelle connexion WebSocket (simulation: {simulation_id})")

    def disconnect(self, websocket: WebSocket, simulation_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if simulation_id and websocket in self.simulation_connections[simulation_id]:
            self.simulation_connections[simulation_id].remove(websocket)
        print(f"🔌 Connexion WebSocket fermée")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_simulation(self, simulation_id: str, message: dict):
        """Diffuse un message à toutes les connexions d'une simulation spécifique"""
        if simulation_id in self.simulation_connections:
            disconnected = []
            for connection in self.simulation_connections[simulation_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            
            # Nettoyer les connexions déconnectées
            for connection in disconnected:
                self.disconnect(connection, simulation_id)

    async def broadcast_to_all(self, message: dict):
        """Diffuse un message à toutes les connexions"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        # Nettoyer les connexions déconnectées
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

# --- 1. BLOOM FILTER (Vérification des chauffeurs) ---
class BloomFilter:
    def __init__(self, size=1000, hash_count=3):
        self.size = size
        self.hash_count = hash_count
        self.bit_array = [0] * size

    def add(self, item):
        for i in range(self.hash_count):
            index = hash(item + str(i)) % self.size
            self.bit_array[index] = 1

    def exists(self, item):
        for i in range(self.hash_count):
            index = hash(item + str(i)) % self.size
            if self.bit_array[index] == 0:
                return False
        return True

# --- 2. SEGMENT TREE (Gestion du trafic temps réel) ---
class SegmentTree:
    def __init__(self, data):
        self.n = len(data)
        self.tree = [0] * (2 * self.n)
        for i in range(self.n):
            self.tree[self.n + i] = data[i]
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]

    def update(self, i, value):
        i += self.n
        self.tree[i] = value
        while i > 1:
            i //= 2
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]

    def query(self, l, r):
        res = 0
        l += self.n
        r += self.n
        while l < r:
            if l % 2 == 1:
                res += self.tree[l]
                l += 1
            if r % 2 == 1:
                r -= 1
                res += self.tree[r]
            l //= 2
            r //= 2
        return res

# --- 3. MIN-HEAP (File de priorité pour véhicules) ---
class VehiclePriorityQueue:
    def __init__(self):
        self.heap = []
        self.counter = 0

    def add_vehicle(self, vehicle_id, priority, location):
        heapq.heappush(self.heap, (priority, self.counter, vehicle_id, location))
        self.counter += 1

    def get_nearest_vehicle(self):
        if not self.heap:
            return None
        priority, _, vehicle_id, location = heapq.heappop(self.heap)
        return vehicle_id, location, priority

    def size(self):
        return len(self.heap)

# --- 4. INITIALISATION DES DONNÉES CAMEROUN ---

# Villes principales du Cameroun avec coordonnées (latitude, longitude)
cities = {
    "Douala": (4.0511, 9.7679),
    "Yaoundé": (3.8480, 11.5021),
    "Bafoussam": (5.4770, 10.4219),
    "Bamenda": (5.9630, 10.1591),
    "Garoua": (9.3226, 13.3936),
    "Maroua": (10.5928, 14.3159),
    "Ngaoundéré": (7.3210, 13.5839),
    "Kumba": (4.6419, 9.4388),
    "Limbe": (4.0244, 9.2140),
    "Buea": (4.1608, 9.2642),
    "Ebolowa": (2.9042, 11.1566),
    "Bertoua": (4.5792, 13.6768),
    "Edea": (3.8060, 10.1363),
    "Dschang": (5.4444, 10.0535),
    "Foumban": (5.7265, 10.8986),
    "Kribi": (2.9375, 9.9102),
    "Mbalmayo": (3.5167, 11.5000),
    "Meiganga": (6.5167, 14.3000),
    "Nkongsamba": (4.9500, 9.9333),
}

# Types de transport au Cameroun avec couleurs spécifiques
TRANSPORT_TYPES = {
    "bus": {
        "speed": 40, 
        "capacity": 40, 
        "cost": 500, 
        "name": "Bus Inter-urbain",
        "color": "#FF5722",
        "icon": "bus",
        "line_color": "#FF5722",
        "marker_color": "#FF5722"
    },
    "bend-skin": {
        "speed": 60, 
        "capacity": 2, 
        "cost": 300, 
        "name": "Moto-taxi (Bend-skin)",
        "color": "#2196F3",
        "icon": "motorcycle",
        "line_color": "#2196F3",
        "marker_color": "#2196F3"
    },
    "taxi": {
        "speed": 50, 
        "capacity": 4, 
        "cost": 800, 
        "name": "Taxi Urbain",
        "color": "#4CAF50",
        "icon": "taxi",
        "line_color": "#4CAF50",
        "marker_color": "#4CAF50"
    },
    "agence": {
        "speed": 70, 
        "capacity": 9, 
        "cost": 2000, 
        "name": "Agence de Voyage",
        "color": "#9C27B0",
        "icon": "van-shuttle",
        "line_color": "#9C27B0",
        "marker_color": "#9C27B0"
    },
    "train": {
        "speed": 80, 
        "capacity": 300, 
        "cost": 1500, 
        "name": "Train Régional",
        "color": "#FF9800",
        "icon": "train",
        "line_color": "#FF9800",
        "marker_color": "#FF9800"
    },
}

# Calcul de distance
def calculate_city_distance(city1: str, city2: str) -> float:
    """Calcule la distance en km entre deux villes"""
    if city1 not in cities or city2 not in cities:
        return 0.0
    
    lat1, lon1 = cities[city1]
    lat2, lon2 = cities[city2]
    
    R = 6371  # Rayon de la Terre en km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2)
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

# Construction du graphe de transport
city_graph = {}
for city1 in cities:
    city_graph[city1] = []
    for city2 in cities:
        if city1 != city2:
            distance = calculate_city_distance(city1, city2)
            if distance < 500:
                if distance < 50:
                    transport_types = ["bend-skin", "taxi", "bus"]
                elif distance < 200:
                    transport_types = ["bus", "agence", "taxi"]
                else:
                    transport_types = ["bus", "agence", "train"]
                
                city_graph[city1].append({
                    "city": city2,
                    "distance": distance,
                    "transport_types": transport_types,
                    "travel_time": distance / TRANSPORT_TYPES[transport_types[0]]["speed"] * 60
                })

# Filtre Bloom pour les chauffeurs actifs
active_drivers = BloomFilter()
drivers_db = {}

# Initialisation de quelques chauffeurs
initial_drivers = [
    {"id": "DRV001", "name": "Jean Mbarga", "vehicle": "bus", "city": "Douala", "rating": 4.5},
    {"id": "DRV002", "name": "Marie Ngo", "vehicle": "taxi", "city": "Yaoundé", "rating": 4.8},
    {"id": "DRV003", "name": "Pierre Fotso", "vehicle": "bend-skin", "city": "Bafoussam", "rating": 4.2},
    {"id": "DRV004", "name": "Alice Kamga", "vehicle": "agence", "city": "Douala", "rating": 4.7},
    {"id": "DRV005", "name": "David Mvogo", "vehicle": "train", "city": "Yaoundé", "rating": 4.9},
]

for driver in initial_drivers:
    active_drivers.add(driver["id"])
    drivers_db[driver["id"]] = driver

# Segment Tree pour le trafic (24 heures)
traffic_delays = SegmentTree([0] * 24)
# Heures de pointe typiques au Cameroun
peak_hours = [7, 8, 16, 17, 18]
for hour in peak_hours:
    traffic_delays.update(hour, 15)

# File de priorité pour les véhicules disponibles
vehicle_queue = VehiclePriorityQueue()

for driver in initial_drivers:
    vehicle_queue.add_vehicle(
        driver["id"],
        driver["rating"],
        driver["city"]
    )

# --- 5. ALGORITHME DE DIJKSTRA AMÉLIORÉ ---
def find_optimal_route(start: str, end: str, current_hour: int, preferences: Dict = None):
    """
    Trouve le meilleur itinéraire entre deux villes
    """
    if start not in city_graph or end not in city_graph:
        return None
    
    delay = traffic_delays.query(current_hour, current_hour + 1)
    
    priority_queue = [(0, start, [], "")]
    visited = {}
    routes_considered = 0
    
    while priority_queue:
        routes_considered += 1
        if routes_considered > 1000:
            break
            
        (current_time, city, path, last_transport) = heapq.heappop(priority_queue)
        
        key = (city, last_transport)
        if key in visited and visited[key] <= current_time:
            continue
            
        visited[key] = current_time
        current_path = path + [(city, last_transport, current_time)]
        
        if city == end:
            total_distance = 0
            transport_modes = []
            
            return {
                "total_time": round(current_time, 1),
                "total_distance": round(total_distance, 1),
                "route": [step[0] for step in current_path],
                "transport_details": transport_modes,
                "delay_factor": delay,
                "estimated_cost": calculate_cost(transport_modes),
                "routes_considered": routes_considered
            }
        
        for connection in city_graph.get(city, []):
            neighbor = connection["city"]
            distance = connection["distance"]
            
            for transport in connection["transport_types"]:
                transport_info = TRANSPORT_TYPES[transport]
                base_time = (distance / transport_info["speed"]) * 60
                
                if delay > 0:
                    traffic_delay = delay if transport != "bend-skin" else delay / 2
                    base_time += traffic_delay
                
                if last_transport and last_transport != transport:
                    base_time += 10
                
                new_time = current_time + base_time
                heapq.heappush(
                    priority_queue,
                    (new_time, neighbor, current_path, transport)
                )
    
    return None

def calculate_cost(transport_modes):
    """Calcule le coût estimé du trajet"""
    total_cost = 0
    for mode in transport_modes:
        if isinstance(mode, dict) and "type" in mode:
            total_cost += TRANSPORT_TYPES.get(mode["type"], {}).get("cost", 0)
    return total_cost

# --- FONCTIONS UTILITAIRES POUR LES SIMULATIONS EN TEMPS RÉEL ---
def generate_simulation_id(start: str, end: str, vehicle_type: str) -> str:
    """Génère un ID unique pour la simulation"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    short_start = start[:3].upper()
    short_end = end[:3].upper()
    short_vehicle = vehicle_type[:2].upper()
    return f"SIM_{short_start}_{short_end}_{short_vehicle}_{timestamp}"

def get_intermediate_stops(start: str, end: str) -> List[str]:
    """Retourne des arrêts intermédiaires plausibles"""
    all_cities = list(cities.keys())
    
    intermediate = []
    if start in all_cities and end in all_cities:
        try:
            start_index = all_cities.index(start)
            end_index = all_cities.index(end)
            
            step = (end_index - start_index) / 4
            for i in range(1, 4):
                idx = int(start_index + (step * i))
                if 0 <= idx < len(all_cities) and all_cities[idx] not in [start, end]:
                    intermediate.append(all_cities[idx])
        except ValueError:
            pass
    
    return intermediate[:3]

def get_vehicle_icon(vehicle_type: str) -> str:
    return TRANSPORT_TYPES.get(vehicle_type, {}).get("icon", "car")

def get_vehicle_name(vehicle_type: str) -> str:
    return TRANSPORT_TYPES.get(vehicle_type, {}).get("name", "Véhicule")

def get_vehicle_color(vehicle_type: str) -> str:
    return TRANSPORT_TYPES.get(vehicle_type, {}).get("color", "#007a5e")

def get_vehicle_line_color(vehicle_type: str) -> str:
    return TRANSPORT_TYPES.get(vehicle_type, {}).get("line_color", "#007a5e")

def get_vehicle_marker_color(vehicle_type: str) -> str:
    return TRANSPORT_TYPES.get(vehicle_type, {}).get("marker_color", "#007a5e")

def interpolate_position(start_coords, end_coords, progress):
    """Interpole une position entre deux coordonnées"""
    lat = start_coords[0] + (end_coords[0] - start_coords[0]) * progress
    lon = start_coords[1] + (end_coords[1] - start_coords[1]) * progress
    return [lat, lon]

def generate_route_points(start_coords, end_coords, num_points=20):
    """Génère des points pour une route réaliste avec légères courbes"""
    points = []
    
    for i in range(num_points + 1):
        progress = i / num_points
        
        lat = start_coords[0] + (end_coords[0] - start_coords[0]) * progress
        lon = start_coords[1] + (end_coords[1] - start_coords[1]) * progress
        
        if 0.2 < progress < 0.8:
            curve_factor = 0.1
            curve = sin(progress * 3.14159) * curve_factor
            lat += curve * 0.5
            lon += curve * 0.3
        
        points.append([lat, lon])
    
    return points

# --- WEB SOCKET ENDPOINT ---
@app.websocket("/ws/simulation/{simulation_id}")
async def websocket_endpoint(websocket: WebSocket, simulation_id: str):
    await manager.connect(websocket, simulation_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "control":
                    action = message.get("action")
                    if action in ["start", "pause", "resume", "stop"]:
                        if simulation_id in active_simulations:
                            sim = active_simulations[simulation_id]
                            if action == "start" and sim["status"] == "created":
                                sim["status"] = "active"
                                sim["start_time"] = datetime.now().isoformat()
                            elif action == "pause" and sim["status"] == "active":
                                sim["status"] = "paused"
                            elif action == "resume" and sim["status"] == "paused":
                                sim["status"] = "active"
                            elif action == "stop":
                                sim["status"] = "completed"
                                sim["end_time"] = datetime.now().isoformat()
                            
                            sim["updated_at"] = datetime.now().isoformat()
                            
                            await manager.broadcast_to_simulation(simulation_id, {
                                "type": "simulation_update",
                                "simulation_id": simulation_id,
                                "status": sim["status"],
                                "progress": sim.get("progress", 0),
                                "timestamp": datetime.now().isoformat()
                            })
            except json.JSONDecodeError:
                pass
            
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, simulation_id)

# WebSocket endpoint pour les connexions globales
@app.websocket("/ws/simulation/global")
async def websocket_global(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except:
                pass
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- ENDPOINTS DE BASE ---
@app.get("/")
async def home():
    """Redirection vers le dashboard React"""
    return RedirectResponse(url="http://localhost:3001")

# --- ENDPOINTS POUR LE FRONTEND REACT ---
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "server": "Smart Transit Cameroon",
        "version": "4.0.0",
        "connected": True,
        "url": "http://localhost:8002",
        "websocket": "ws://localhost:8002/ws/simulation/{simulation_id}",
        "frontend_url": "http://localhost:3001"
    }

@app.get("/api/v1/health/frontend")
async def frontend_health_check():
    """Health check spécifique pour le frontend"""
    return {
        "status": "connected",
        "backend": "FastAPI Smart Transit Cameroon",
        "version": "4.0.0",
        "url": "http://localhost:8002",
        "frontend_url": "http://localhost:3001",
        "dashboard": "http://localhost:3001/dashboard",
        "api_docs": "http://localhost:8002/docs",
        "websocket": "ws://localhost:8002/ws/simulation/{simulation_id}",
        "timestamp": datetime.now().isoformat(),
        "system_status": {
            "cities_count": len(cities),
            "drivers_count": len(drivers_db),
            "active_simulations": len(active_simulations),
            "vehicle_types": len(TRANSPORT_TYPES)
        }
    }

@app.get("/api/test/connection")
async def test_api_connection():
    """Endpoint pour tester la connexion API"""
    return {
        "connected": True,
        "server": "Smart Transit Cameroon",
        "url": "http://localhost:8002",
        "frontend_url": "http://localhost:3001",
        "dashboard_url": "http://localhost:3001/dashboard",
        "websocket": "ws://localhost:8002/ws/simulation/{simulation_id}",
        "timestamp": datetime.now().isoformat(),
        "docs": "http://localhost:8002/docs"
    }

@app.get("/api/v1/system/status")
async def get_frontend_system_status():
    """Endpoint pour le statut système du frontend"""
    return {
        "status": "operational",
        "cities": len(cities),
        "active_drivers": len(drivers_db),
        "available_vehicles": vehicle_queue.size(),
        "traffic_system": "active",
        "active_simulations": len(active_simulations),
        "websocket_connections": len(manager.active_connections),
        "frontend_url": "http://localhost:3001",
        "dashboard_url": "http://localhost:3001/dashboard",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/system/stats")
async def get_frontend_system_stats():
    """Endpoint pour les stats système du frontend"""
    total_routes = sum(len(connections) for connections in city_graph.values()) // 2
    return {
        "total_cities": len(cities),
        "total_routes": total_routes,
        "active_drivers": len(drivers_db),
        "available_vehicles": vehicle_queue.size(),
        "transport_types": len(TRANSPORT_TYPES),
        "system_load": "modéré",
        "response_time": "45ms",
        "uptime": "99.9%",
        "frontend_url": "http://localhost:3001",
        "dashboard_url": "http://localhost:3001/dashboard",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/traffic")
async def get_frontend_traffic_data():
    """Endpoint pour les données de trafic du frontend"""
    traffic_list = []
    for hour in range(24):
        delay = traffic_delays.query(hour, hour + 1)
        status = "fluide" if delay < 5 else "modéré" if delay < 15 else "saturé"
        traffic_list.append({
            "hour": hour,
            "delay_minutes": delay,
            "status": status
        })
    return {"traffic": traffic_list}

@app.get("/api/v1/cities")
async def get_frontend_cities():
    """Endpoint pour la liste des villes du frontend"""
    return {"cities": list(cities.keys())}

# --- ENDPOINTS POUR LES SIMULATIONS EN TEMPS RÉEL ---
@app.post("/api/v1/simulations/create")
async def create_simulation_endpoint(request: SimulationRequest):
    """Créer une nouvelle simulation via API"""
    if request.start_city not in cities:
        raise HTTPException(status_code=400, detail=f"Ville de départ invalide: {request.start_city}")
    
    if request.end_city not in cities:
        raise HTTPException(status_code=400, detail=f"Ville d'arrivée invalide: {request.end_city}")
    
    if request.start_city == request.end_city:
        raise HTTPException(status_code=400, detail="La ville de départ et d'arrivée doivent être différentes")
    
    if request.departure_hour < 0 or request.departure_hour > 23:
        raise HTTPException(status_code=400, detail="L'heure de départ doit être entre 0 et 23")
    
    if request.vehicle_type not in TRANSPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Type de véhicule invalide: {request.vehicle_type}")
    
    simulation_id = generate_simulation_id(request.start_city, request.end_city, request.vehicle_type)
    
    total_distance = calculate_city_distance(request.start_city, request.end_city)
    
    vehicle_speed = TRANSPORT_TYPES[request.vehicle_type]["speed"]
    estimated_time = (total_distance / vehicle_speed) * 60
    
    traffic_delay = traffic_delays.query(request.departure_hour, request.departure_hour + 1)
    traffic_status = "fluide" if traffic_delay < 5 else "modéré" if traffic_delay < 15 else "saturé"
    
    start_coords = cities[request.start_city]
    end_coords = cities[request.end_city]
    
    route_points = generate_route_points(start_coords, end_coords)
    
    simulation_data = {
        "simulation_id": simulation_id,
        "start_city": request.start_city,
        "end_city": request.end_city,
        "vehicle_type": request.vehicle_type,
        "vehicle_name": get_vehicle_name(request.vehicle_type),
        "vehicle_color": get_vehicle_color(request.vehicle_type),
        "vehicle_line_color": get_vehicle_line_color(request.vehicle_type),
        "vehicle_marker_color": get_vehicle_marker_color(request.vehicle_type),
        "departure_hour": request.departure_hour,
        "status": "created",
        "progress": 0.0,
        "start_time": datetime.now().isoformat(),
        "end_time": None,
        "current_position": {"latitude": start_coords[0], "longitude": start_coords[1]},
        "start_coordinates": {"latitude": start_coords[0], "longitude": start_coords[1]},
        "end_coordinates": {"latitude": end_coords[0], "longitude": end_coords[1]},
        "route_points": route_points,
        "distance_traveled": 0.0,
        "total_distance": round(total_distance, 2),
        "estimated_time": round(estimated_time, 2),
        "traffic_status": traffic_status,
        "stops": get_intermediate_stops(request.start_city, request.end_city),
        "vehicle_speed": vehicle_speed,
        "vehicle_icon": get_vehicle_icon(request.vehicle_type),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "visualization": {
            "line_color": get_vehicle_line_color(request.vehicle_type),
            "marker_color": get_vehicle_marker_color(request.vehicle_type),
            "line_width": 4,
            "dash_array": "10, 10",
            "marker_animation": "pulse",
            "show_trail": True,
            "trail_color": get_vehicle_line_color(request.vehicle_type) + "80"
        }
    }
    
    active_simulations[simulation_id] = simulation_data
    
    await manager.broadcast_to_all({
        "type": "new_simulation",
        "simulation_id": simulation_id,
        "simulation": simulation_data,
        "timestamp": datetime.now().isoformat()
    })
    
    return {
        "success": True,
        "simulation_id": simulation_id,
        "message": "Simulation créée avec succès",
        "data": simulation_data,
        "websocket_url": f"ws://localhost:8002/ws/simulation/{simulation_id}",
        "dashboard_url": f"/route/simulate/{request.start_city}/{request.end_city}/{request.vehicle_type}/{request.departure_hour}",
        "api_url": f"/api/v1/simulations/{simulation_id}",
        "frontend_url": "http://localhost:3001/dashboard",
    }

@app.get("/api/v1/simulations/active")
async def get_active_simulations_list():
    """Récupérer la liste des simulations actives pour le frontend"""
    active_list = []
    
    for sim_id, sim in active_simulations.items():
        if sim["status"] == "active" and sim.get("start_time"):
            try:
                start_time = datetime.fromisoformat(sim["start_time"].replace("Z", "+00:00"))
                elapsed_minutes = (datetime.now() - start_time).total_seconds() / 60
                total_time = sim.get("estimated_time", 60)
                sim["progress"] = min(1.0, elapsed_minutes / total_time) if total_time > 0 else 0.0
                sim["distance_traveled"] = sim["progress"] * sim.get("total_distance", 100)
                
                if sim.get("route_points"):
                    progress_index = int(sim["progress"] * (len(sim["route_points"]) - 1))
                    progress_index = max(0, min(progress_index, len(sim["route_points"]) - 1))
                    current_point = sim["route_points"][progress_index]
                    sim["current_position"] = {"latitude": current_point[0], "longitude": current_point[1]}
            except:
                sim["progress"] = 0.0
        
        active_list.append({
            "simulation_id": sim_id,
            "start_city": sim.get("start_city", "Inconnu"),
            "end_city": sim.get("end_city", "Inconnu"),
            "vehicle_type": sim.get("vehicle_type", "bus"),
            "vehicle_name": sim.get("vehicle_name", get_vehicle_name(sim.get("vehicle_type", "bus"))),
            "vehicle_color": sim.get("vehicle_color", "#007a5e"),
            "vehicle_line_color": sim.get("vehicle_line_color", "#007a5e"),
            "departure_hour": sim.get("departure_hour", 12),
            "status": sim.get("status", "created"),
            "progress": sim.get("progress", 0.0),
            "current_position": sim.get("current_position", {"latitude": 0, "longitude": 0}),
            "distance_traveled": sim.get("distance_traveled", 0.0),
            "total_distance": sim.get("total_distance", 100.0),
            "vehicle_icon": sim.get("vehicle_icon", "car"),
            "route_points": sim.get("route_points", []),
            "visualization": sim.get("visualization", {})
        })
    
    return {
        "simulations": active_list,
        "total": len(active_list),
        "is_mock_data": False,
        "websocket_url": "ws://localhost:8002/ws/simulation/{simulation_id}",
        "frontend_url": "http://localhost:3001",
        "dashboard_url": "http://localhost:3001/dashboard",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/simulations/statistics")
async def get_simulation_statistics_endpoint():
    """Statistiques des simulations pour le frontend"""
    active_count = len(active_simulations)
    total_count = len(simulation_history) + active_count
    
    start_cities = [s.get("start_city") for s in simulation_history + list(active_simulations.values()) 
                   if s.get("start_city")]
    most_common_start = max(set(start_cities), key=start_cities.count) if start_cities else "Aucune"
    
    vehicle_types = [s.get("vehicle_type") for s in simulation_history + list(active_simulations.values()) 
                    if s.get("vehicle_type")]
    most_common_vehicle = max(set(vehicle_types), key=vehicle_types.count) if vehicle_types else "bus"
    
    end_cities = [s.get("end_city") for s in simulation_history + list(active_simulations.values()) 
                 if s.get("end_city")]
    most_common_end = max(set(end_cities), key=end_cities.count) if end_cities else "Aucune"
    
    completed_simulations = len([s for s in simulation_history if s.get("status") == "completed"])
    
    return {
        "statistics": {
            "total_simulations": total_count,
            "active_simulations": active_count,
            "completed_simulations": completed_simulations,
            "most_common_start_city": most_common_start,
            "most_common_end_city": most_common_end,
            "most_common_vehicle": most_common_vehicle,
            "average_duration": "45.2 min",
            "peak_hour": "14h",
            "websocket_connections": len(manager.active_connections)
        },
        "frontend_url": "http://localhost:3001",
        "dashboard_url": "http://localhost:3001/dashboard"
    }

@app.post("/api/v1/simulations/{simulation_id}/{action}")
async def control_simulation_endpoint(simulation_id: str, action: str):
    """Contrôler une simulation (start, pause, resume, cancel, complete)"""
    if simulation_id not in active_simulations:
        archived_sim = None
        for sim in simulation_history:
            if sim.get("simulation_id") == simulation_id:
                archived_sim = sim
                break
        
        if archived_sim:
            raise HTTPException(status_code=410, detail=f"Simulation archivée (statut: {archived_sim.get('status', 'unknown')})")
        else:
            raise HTTPException(status_code=404, detail="Simulation non trouvée")
    
    simulation = active_simulations[simulation_id]
    
    valid_actions = ["start", "pause", "resume", "cancel", "complete"]
    if action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Action invalide. Options: {valid_actions}")
    
    old_status = simulation["status"]
    
    if action == "start":
        simulation["status"] = "active"
        simulation["start_time"] = datetime.now().isoformat()
    elif action == "pause":
        simulation["status"] = "paused"
    elif action == "resume":
        simulation["status"] = "active"
    elif action == "cancel":
        simulation["status"] = "cancelled"
        simulation["end_time"] = datetime.now().isoformat()
        simulation_history.append(simulation.copy())
        del active_simulations[simulation_id]
    elif action == "complete":
        simulation["status"] = "completed"
        simulation["end_time"] = datetime.now().isoformat()
        simulation["progress"] = 1.0
        simulation["distance_traveled"] = simulation["total_distance"]
        
        if simulation.get("route_points"):
            final_point = simulation["route_points"][-1] if simulation["route_points"] else simulation.get("end_coordinates")
            if final_point:
                simulation["current_position"] = {"latitude": final_point[0], "longitude": final_point[1]}
        
        simulation_history.append(simulation.copy())
        del active_simulations[simulation_id]
    
    simulation["updated_at"] = datetime.now().isoformat()
    
    await manager.broadcast_to_simulation(simulation_id, {
        "type": "simulation_control",
        "simulation_id": simulation_id,
        "action": action,
        "old_status": old_status,
        "new_status": simulation["status"],
        "timestamp": datetime.now().isoformat()
    })
    
    await manager.broadcast_to_all({
        "type": "simulation_status_update",
        "simulation_id": simulation_id,
        "status": simulation["status"],
        "action": action,
        "timestamp": datetime.now().isoformat()
    })
    
    return {
        "success": True,
        "simulation_id": simulation_id,
        "action": action,
        "status": simulation["status"],
        "message": f"Simulation {action}ée avec succès",
        "websocket_notified": True,
        "frontend_url": "http://localhost:3001/dashboard"
    }

@app.post("/api/v1/simulations/{simulation_id}/complete")
async def complete_simulation_endpoint(simulation_id: str):
    """Marquer une simulation comme terminée (endpoint séparé pour compatibilité)"""
    return await control_simulation_endpoint(simulation_id, "complete")

@app.get("/api/v1/simulations/{simulation_id}")
async def get_simulation_details(simulation_id: str):
    """Obtenir les détails d'une simulation spécifique"""
    if simulation_id in active_simulations:
        return {
            "status": "active",
            "simulation": active_simulations[simulation_id],
            "is_archived": False,
            "found": True,
            "frontend_url": "http://localhost:3001",
            "dashboard_url": "http://localhost:3001/dashboard"
        }
    
    archived_sim = None
    for sim in simulation_history:
        if sim.get("simulation_id") == simulation_id:
            archived_sim = sim
            break
    
    if archived_sim:
        return {
            "status": "archived",
            "simulation": archived_sim,
            "is_archived": True,
            "found": True,
            "message": f"Simulation archivée (statut: {archived_sim.get('status', 'unknown')})",
            "frontend_url": "http://localhost:3001",
            "dashboard_url": "http://localhost:3001/dashboard"
        }
    
    raise HTTPException(
        status_code=404, 
        detail=f"Simulation {simulation_id} non trouvée",
        headers={
            "X-Simulation-Status": "not_found",
            "X-Active-Simulations": str(len(active_simulations)),
            "X-Archived-Simulations": str(len(simulation_history)),
            "X-Frontend-URL": "http://localhost:3001/dashboard"
        }
    )

# --- NOUVEL ENDPOINT POUR RÉCUPÉRER LES SIMULATIONS AVEC PAGINATION ---
@app.get("/api/v1/simulations")
async def get_all_simulations(
    limit: int = 10,
    offset: int = 0,
    status: Optional[str] = None,
    start_city: Optional[str] = None,
    end_city: Optional[str] = None
):
    """Récupérer toutes les simulations avec filtrage et pagination"""
    
    all_simulations = []
    
    for sim_id, sim in active_simulations.items():
        sim_copy = sim.copy()
        sim_copy["is_archived"] = False
        sim_copy["simulation_id"] = sim_id
        all_simulations.append(sim_copy)
    
    for sim in simulation_history:
        sim_copy = sim.copy()
        sim_copy["is_archived"] = True
        all_simulations.append(sim_copy)
    
    if status:
        all_simulations = [s for s in all_simulations if s.get("status") == status]
    
    if start_city:
        all_simulations = [s for s in all_simulations if s.get("start_city") == start_city]
    
    if end_city:
        all_simulations = [s for s in all_simulations if s.get("end_city") == end_city]
    
    all_simulations.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    total_count = len(all_simulations)
    paginated_simulations = all_simulations[offset:offset + limit]
    
    return {
        "simulations": paginated_simulations,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total_count,
        "filters": {
            "status": status,
            "start_city": start_city,
            "end_city": end_city
        },
        "frontend_url": "http://localhost:3001",
        "dashboard_url": "http://localhost:3001/dashboard"
    }

# --- ENDPOINTS POUR LA SIMULATION DE ROUTES EN TEMPS RÉEL ---
@app.get("/route/simulate/{start}/{end}/{vehicle_type}/{hour}")
async def simulate_route(start: str, end: str, vehicle_type: str, hour: int):
    """Simuler un trajet sur carte du Cameroun en temps réel"""
    
    if start not in cities:
        raise HTTPException(status_code=400, detail=f"Ville de départ '{start}' non trouvée")
    if end not in cities:
        raise HTTPException(status_code=400, detail=f"Ville d'arrivée '{end}' non trouvée")
    if vehicle_type not in TRANSPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Type de véhicule '{vehicle_type}' non supporté")
    
    simulation_id = generate_simulation_id(start, end, vehicle_type)
    
    total_distance = calculate_city_distance(start, end)
    start_coords = cities[start]
    end_coords = cities[end]
    
    vehicle_speed = TRANSPORT_TYPES[vehicle_type]["speed"]
    estimated_time = (total_distance / vehicle_speed) * 60
    
    traffic_delay = traffic_delays.query(hour, hour + 1)
    traffic_status = "fluide" if traffic_delay < 5 else "modéré" if traffic_delay < 15 else "saturé"
    
    route_points = generate_route_points(start_coords, end_coords)
    
    simulation_data = {
        "simulation_id": simulation_id,
        "start_city": start,
        "end_city": end,
        "vehicle_type": vehicle_type,
        "departure_hour": hour,
        "status": "created",
        "progress": 0.0,
        "start_time": datetime.now().isoformat(),
        "end_time": None,
        "current_position": {"latitude": start_coords[0], "longitude": start_coords[1]},
        "start_coordinates": {"latitude": start_coords[0], "longitude": start_coords[1]},
        "end_coordinates": {"latitude": end_coords[0], "longitude": end_coords[1]},
        "route_points": route_points,
        "distance_traveled": 0.0,
        "total_distance": round(total_distance, 2),
        "estimated_time": round(estimated_time, 2),
        "traffic_status": traffic_status,
        "traffic_delay": traffic_delay,
        "stops": get_intermediate_stops(start, end),
        "vehicle_speed": vehicle_speed,
        "vehicle_name": get_vehicle_name(vehicle_type),
        "vehicle_color": get_vehicle_color(vehicle_type),
        "vehicle_line_color": get_vehicle_line_color(vehicle_type),
        "vehicle_marker_color": get_vehicle_marker_color(vehicle_type),
        "vehicle_icon": get_vehicle_icon(vehicle_type),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "visualization": {
            "line_color": get_vehicle_line_color(vehicle_type),
            "marker_color": get_vehicle_marker_color(vehicle_type),
            "line_width": 6,
            "dash_array": "15, 10",
            "marker_animation": "bounce",
            "show_trail": True,
            "trail_color": get_vehicle_line_color(vehicle_type) + "60",
            "pulse_effect": True,
            "pulse_color": get_vehicle_line_color(vehicle_type) + "40",
            "shadow": True,
            "shadow_color": "#00000040"
        }
    }
    
    active_simulations[simulation_id] = simulation_data
    
    print(f"🚀 NOUVELLE SIMULATION EN TEMPS RÉEL: {simulation_id}")
    print(f"   Trajet: {start} → {end}")
    print(f"   Véhicule: {vehicle_type} ({get_vehicle_name(vehicle_type)})")
    print(f"   Distance: {total_distance:.1f} km")
    print(f"   Temps estimé: {estimated_time:.1f} min")
    print(f"   Couleur de la ligne: {get_vehicle_line_color(vehicle_type)}")
    print(f"   WebSocket: ws://localhost:8001/ws/simulation/{simulation_id}")
    print(f"   Frontend Dashboard: http://localhost:3001/dashboard")
    
    await manager.broadcast_to_all({
        "type": "new_real_time_simulation",
        "simulation_id": simulation_id,
        "simulation": simulation_data,
        "timestamp": datetime.now().isoformat()
    })
    
    html_content = generate_real_time_simulation_html(start, end, vehicle_type, hour, simulation_id, simulation_data)
    return HTMLResponse(content=html_content)

def generate_real_time_simulation_html(start: str, end: str, vehicle_type: str, hour: int, simulation_id: str, sim_data: dict):
    """Génère le HTML pour la page de simulation en temps réel"""
    
    vehicle_name = get_vehicle_name(vehicle_type)
    vehicle_color = get_vehicle_color(vehicle_type)
    vehicle_line_color = get_vehicle_line_color(vehicle_type)
    vehicle_marker_color = get_vehicle_marker_color(vehicle_type)
    
    traffic_delay = sim_data.get('traffic_delay', 0)
    
    cities_js = json.dumps({city: list(coords) for city, coords in cities.items()}, ensure_ascii=False)
    vehicle_speeds = {vt: info["speed"] for vt, info in TRANSPORT_TYPES.items()}
    vehicle_speeds_js = json.dumps(vehicle_speeds)
    
    simulation_data_js = json.dumps(sim_data, ensure_ascii=False)
    
    frontend_url = "http://localhost:3001"
    dashboard_url = f"{frontend_url}/dashboard"
    
    html = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Simulation Temps Réel {simulation_id} - {start} → {end}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }}
            
            body {{
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                padding: 20px;
                overflow-x: hidden;
            }}
            
            .container {{
                max-width: 1600px;
                margin: 0 auto;
            }}
            
            .real-time-header {{
                background: linear-gradient(90deg, {vehicle_color} 0%, {vehicle_line_color} 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                margin-bottom: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }}
            
            .real-time-header::before {{
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
                background-size: 20px 20px;
                animation: moveBackground 20s linear infinite;
                z-index: 0;
            }}
            
            @keyframes moveBackground {{
                0% {{ transform: translate(0, 0); }}
                100% {{ transform: translate(20px, 20px); }}
            }}
            
            .header-top-row {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
                z-index: 1;
            }}
            
            .header-bottom-row {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
                z-index: 1;
                flex-wrap: wrap;
                gap: 15px;
            }}
            
            .route-info {{
                display: flex;
                align-items: center;
                gap: 20px;
            }}
            
            .vehicle-icon-large {{
                font-size: 3rem;
                color: white;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                animation: bounce 2s infinite;
            }}
            
            @keyframes bounce {{
                0%, 100% {{ transform: translateY(0); }}
                50% {{ transform: translateY(-10px); }}
            }}
            
            .route-details h1 {{
                font-size: 2rem;
                margin-bottom: 5px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }}
            
            .route-subtitle {{
                color: rgba(255, 255, 255, 0.9);
                font-size: 1.1rem;
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }}
            
            .real-time-badge {{
                background: rgba(255, 255, 255, 0.2);
                padding: 8px 15px;
                border-radius: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                backdrop-filter: blur(10px);
            }}
            
            .simulation-id-container {{
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            
            .dashboard-btn-container {{
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            
            .dashboard-btn {{
                background: linear-gradient(90deg, #007a5e 0%, #00563f 100%);
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                text-decoration: none;
                font-size: 1rem;
                animation: pulseDashboard 2s infinite;
            }}
            
            .dashboard-btn:hover {{
                background: linear-gradient(90deg, #00563f 0%, #003d2a 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            }}
            
            .dashboard-btn.hidden {{
                display: flex !important;
            }}
            
            @keyframes pulseDashboard {{
                0% {{ box-shadow: 0 0 0 0 rgba(0, 122, 94, 0.7); }}
                70% {{ box-shadow: 0 0 0 10px rgba(0, 122, 94, 0); }}
                100% {{ box-shadow: 0 0 0 0 rgba(0, 122, 94, 0); }}
            }}
            
            .dashboard-btn.completed {{
                background: linear-gradient(90deg, #2ecc71 0%, #27ae60 100%);
                animation: pulseSuccess 1.5s infinite;
            }}
            
            @keyframes pulseSuccess {{
                0% {{ box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }}
                70% {{ box-shadow: 0 0 0 15px rgba(46, 204, 113, 0); }}
                100% {{ box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }}
            }}
            
            .pulse-dot {{
                width: 12px;
                height: 12px;
                background: #00FF00;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }}
            
            @keyframes pulse {{
                0% {{ opacity: 1; transform: scale(1); }}
                50% {{ opacity: 0.5; transform: scale(1.2); }}
                100% {{ opacity: 1; transform: scale(1); }}
            }}
            
            .simulation-container {{
                display: grid;
                grid-template-columns: 1fr 400px;
                gap: 20px;
                margin-bottom: 20px;
            }}
            
            .map-container {{
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
                height: 700px;
                position: relative;
            }}
            
            #cameroonMap {{
                width: 100%;
                height: 100%;
                border-radius: 15px;
            }}
            
            .map-overlay {{
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 1000;
                max-width: 300px;
            }}
            
            .control-panel {{
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                color: white;
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                gap: 20px;
            }}
            
            .control-section {{
                padding-bottom: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }}
            
            .section-title {{
                font-size: 1.2rem;
                font-weight: 600;
                margin-bottom: 15px;
                color: #ecf0f1;
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            
            .control-buttons {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-top: 15px;
            }}
            
            .control-btn {{
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: none;
                padding: 12px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
            }}
            
            .control-btn:hover {{
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }}
            
            .control-btn.active {{
                background: {vehicle_color};
                box-shadow: 0 4px 15px {vehicle_color}80;
            }}
            
            .control-btn.start {{ background: #2ecc71; }}
            .control-btn.pause {{ background: #f39c12; }}
            .control-btn.stop {{ background: #e74c3c; }}
            
            .progress-container {{
                margin-top: 20px;
            }}
            
            .progress-label {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                color: #ecf0f1;
            }}
            
            .progress-bar {{
                height: 12px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                overflow: hidden;
            }}
            
            .progress-fill {{
                height: 100%;
                background: linear-gradient(90deg, {vehicle_color}, {vehicle_line_color});
                width: 0%;
                transition: width 0.5s ease;
                position: relative;
                overflow: hidden;
            }}
            
            .progress-fill::after {{
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shimmer 2s infinite;
            }}
            
            @keyframes shimmer {{
                0% {{ left: -100%; }}
                100% {{ left: 100%; }}
            }}
            
            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-top: 15px;
            }}
            
            .stat-card {{
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 10px;
                text-align: center;
                backdrop-filter: blur(5px);
            }}
            
            .stat-value {{
                font-size: 1.8rem;
                font-weight: 700;
                color: white;
                margin-bottom: 5px;
            }}
            
            .stat-label {{
                font-size: 0.9rem;
                color: #bdc3c7;
            }}
            
            .vehicle-display {{
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                gap: 15px;
                margin-top: 10px;
            }}
            
            .vehicle-visual {{
                font-size: 2.5rem;
                color: {vehicle_color};
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            }}
            
            .vehicle-info h3 {{
                color: white;
                margin-bottom: 5px;
            }}
            
            .vehicle-info p {{
                color: #bdc3c7;
                font-size: 0.9rem;
            }}
            
            .traffic-indicator {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                margin-top: 15px;
            }}
            
            .traffic-status {{
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            
            .traffic-dot {{
                width: 12px;
                height: 12px;
                border-radius: 50%;
            }}
            
            .traffic-fluide {{ background: #2ecc71; animation: pulse 2s infinite; }}
            .traffic-modere {{ background: #f39c12; animation: pulse 1.5s infinite; }}
            .traffic-sature {{ background: #e74c3c; animation: pulse 1s infinite; }}
            
            .ws-status-container {{
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 10px;
            }}
            
            .footer {{
                text-align: center;
                margin-top: 20px;
                color: #666;
                padding: 20px;
                font-size: 0.9rem;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            }}
            
            .vehicle-marker {{
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 10px rgba(0,0,0,0.3);
                animation: vehicleMove 2s infinite alternate;
            }}
            
            @keyframes vehicleMove {{
                0% {{ transform: scale(1) rotate(0deg); }}
                100% {{ transform: scale(1.1) rotate(5deg); }}
            }}
            
            .animated-path {{
                stroke-dasharray: 10;
                animation: dash 1s linear infinite;
            }}
            
            @keyframes dash {{
                to {{ stroke-dashoffset: 20; }}
            }}
            
            @media (max-width: 1200px) {{
                .simulation-container {{
                    grid-template-columns: 1fr;
                }}
                
                .map-container {{
                    height: 500px;
                }}
                
                .control-panel {{
                    order: -1;
                }}
            }}
            
            @media (max-width: 768px) {{
                .header-top-row, .header-bottom-row {{
                    flex-direction: column;
                    gap: 15px;
                    text-align: center;
                }}
                
                .route-info {{
                    flex-direction: column;
                    text-align: center;
                }}
                
                .simulation-id-container, .dashboard-btn-container {{
                    width: 100%;
                    justify-content: center;
                }}
                
                .dashboard-btn, .real-time-badge {{
                    width: 100%;
                    justify-content: center;
                }}
                
                .control-buttons {{
                    grid-template-columns: 1fr;
                }}
                
                .stats-grid {{
                    grid-template-columns: 1fr;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <header class="real-time-header">
                <div class="header-top-row">
                    <div class="route-info">
                        <div class="vehicle-icon-large">
                            <i class="fas fa-{sim_data['vehicle_icon']}"></i>
                        </div>
                        <div class="route-details">
                            <h1>SIMULATION TEMPS RÉEL : {start} → {end}</h1>
                            <div class="route-subtitle">
                                <span><i class="fas fa-car"></i> {vehicle_name}</span>
                                <span><i class="fas fa-clock"></i> Départ: {hour}h</span>
                                <span><i class="fas fa-route"></i> {sim_data['total_distance']} km</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="header-bottom-row">
                    <div class="simulation-id-container">
                        <div class="real-time-badge">
                            <div class="pulse-dot"></div>
                            EN DIRECT
                        </div>
                        <div class="real-time-badge">
                            <i class="fas fa-qrcode"></i> ID: {simulation_id}
                        </div>
                    </div>
                    
                    <div class="dashboard-btn-container">
                        <a href="{dashboard_url}" class="dashboard-btn" id="dashboardButton" target="_blank">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>Tableau de bord React</span>
                        </a>
                    </div>
                </div>
            </header>
            
            <div class="simulation-container">
                <div class="map-container">
                    <div id="cameroonMap"></div>
                    <div class="map-overlay">
                        <h3><i class="fas fa-map-marker-alt"></i> Simulation Active</h3>
                        <p style="margin: 10px 0; color: #666; font-size: 0.9rem;">
                            Suivi en temps réel du trajet {start} → {end}
                        </p>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 20px; height: 20px; background: {vehicle_line_color}; border-radius: 4px;"></div>
                            <span style="font-size: 0.9rem; color: #666;">Ligne: {vehicle_name}</span>
                        </div>
                    </div>
                </div>
                
                <div class="control-panel">
                    <div class="control-section">
                        <h2 class="section-title"><i class="fas fa-gamepad"></i> Contrôles</h2>
                        <div class="control-buttons">
                            <button class="control-btn start" onclick="startSimulation()">
                                <i class="fas fa-play"></i> Démarrer
                            </button>
                            <button class="control-btn pause" onclick="pauseSimulation()">
                                <i class="fas fa-pause"></i> Pause
                            </button>
                            <button class="control-btn" onclick="resetSimulation()">
                                <i class="fas fa-redo"></i> Réinitialiser
                            </button>
                            <button class="control-btn stop" onclick="stopSimulation()">
                                <i class="fas fa-stop"></i> Arrêter
                            </button>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h2 class="section-title"><i class="fas fa-tachometer-alt"></i> Progression</h2>
                        <div class="progress-container">
                            <div class="progress-label">
                                <span>Avancement</span>
                                <span id="progress-percent">0%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" id="progress-fill"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h2 class="section-title"><i class="fas fa-car"></i> Véhicule</h2>
                        <div class="vehicle-display">
                            <div class="vehicle-visual">
                                <i class="fas fa-{sim_data['vehicle_icon']}"></i>
                            </div>
                            <div class="vehicle-info">
                                <h3 id="vehicle-name">{vehicle_name}</h3>
                                <p id="vehicle-specs">Vitesse: {sim_data['vehicle_speed']} km/h • Distance: {sim_data['total_distance']} km</p>
                                <p style="color: {vehicle_color}; font-weight: 600; margin-top: 5px;">
                                    <i class="fas fa-palette"></i> Couleur: {vehicle_name}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h2 class="section-title"><i class="fas fa-chart-line"></i> Statistiques</h2>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-value" id="distance-traveled">0 km</div>
                                <div class="stat-label">Distance parcourue</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="elapsed-time">0 min</div>
                                <div class="stat-label">Temps écoulé</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="average-speed">0 km/h</div>
                                <div class="stat-label">Vitesse moyenne</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="remaining-time">-- min</div>
                                <div class="stat-label">Temps restant</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h2 class="section-title"><i class="fas fa-traffic-light"></i> Conditions</h2>
                        <div class="traffic-indicator">
                            <div class="traffic-status">
                                <div class="traffic-dot {sim_data.get('traffic_status', 'fluide')}"></div>
                                <span id="traffic-status-text">{sim_data.get('traffic_status', 'fluide').capitalize()}</span>
                            </div>
                            <div id="traffic-delay">Retard: {traffic_delay} min</div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h2 class="section-title"><i class="fas fa-plug"></i> Connexion</h2>
                        <div class="ws-status-container">
                            <div id="ws-status-dot" class="pulse-dot" style="background: #2ecc71;"></div>
                            <span id="ws-status">Connecté au serveur temps réel</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <footer class="footer">
                <p>
                    <i class="fas fa-copyright"></i> 2024 Smart Transit Cameroon - Simulation en Temps Réel
                </p>
                <p>
                    <i class="fas fa-sync-alt"></i> Données actualisées en temps réel | 
                    <i class="fas fa-bolt"></i> WebSocket actif | 
                    <i class="fas fa-map-marked-alt"></i> Visualisation interactive |
                    <i class="fas fa-id-card"></i> ID: {simulation_id} |
                    <i class="fas fa-external-link-alt"></i> 
                    <a href="{dashboard_url}" style="color: #007a5e; text-decoration: none; font-weight: 600;">
                        Tableau de bord React
                    </a>
                </p>
            </footer>
        </div>
        
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        
        <script>
            const SIMULATION_ID = "{simulation_id}";
            const SIMULATION_DATA = {simulation_data_js};
            const CAMEROON_CITIES = {cities_js};
            const VEHICLE_SPEEDS = {vehicle_speeds_js};
            const BACKEND_URL = "http://localhost:8002";
            const WS_URL = `ws://localhost:8001/ws/simulation/${{SIMULATION_ID}}`;
            
            let map;
            let simulationInterval;
            let currentProgress = 0;
            let totalDistance = SIMULATION_DATA.total_distance;
            let totalTime = SIMULATION_DATA.estimated_time;
            let isSimulating = false;
            let isPaused = false;
            let vehicleMarker;
            let routeLine;
            let trailLine;
            let websocket;
            let lastUpdateTime = Date.now();
            let simulationCompleted = false;
            
            const dashboardButton = document.getElementById('dashboardButton');
            
            function initializeMap() {{
                const cameroonCenter = [5.5, 12.0];
                
                map = L.map('cameroonMap').setView(cameroonCenter, 7);
                
                L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18,
                }}).addTo(map);
                
                const cameroonBounds = L.latLngBounds(
                    [1.654, 8.382],
                    [13.078, 16.192]
                );
                map.setMaxBounds(cameroonBounds);
                
                Object.entries(CAMEROON_CITIES).forEach(([city, coords]) => {{
                    const marker = L.circleMarker([coords[0], coords[1]], {{
                        radius: 6,
                        fillColor: '#007a5e',
                        color: '#00563f',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }}).addTo(map);
                    
                    marker.bindTooltip(`<b>${{city}}</b><br>(${{coords[0].toFixed(4)}}, ${{coords[1].toFixed(4)}})`, {{
                        permanent: false,
                        direction: 'top'
                    }});
                }});
                
                highlightCities();
                drawRoute();
            }}
            
            function highlightCities() {{
                const start = "{start}";
                const end = "{end}";
                
                if (CAMEROON_CITIES[start]) {{
                    const startMarker = L.marker([CAMEROON_CITIES[start][0], CAMEROON_CITIES[start][1]], {{
                        icon: L.divIcon({{
                            className: 'city-marker',
                            html: `<div style="background: #2ecc71; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);">
                                <i class="fas fa-play-circle"></i> ${{start}} (DÉPART)
                            </div>`,
                            iconSize: [180, 50],
                            iconAnchor: [90, 50]
                        }})
                    }}).addTo(map);
                }}
                
                if (CAMEROON_CITIES[end]) {{
                    const endMarker = L.marker([CAMEROON_CITIES[end][0], CAMEROON_CITIES[end][1]], {{
                        icon: L.divIcon({{
                            className: 'city-marker',
                            html: `<div style="background: #e74c3c; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);">
                                <i class="fas fa-flag-checkered"></i> ${{end}} (ARRIVÉE)
                            </div>`,
                            iconSize: [180, 50],
                            iconAnchor: [90, 50]
                        }})
                    }}).addTo(map);
                }}
            }}
            
            function drawRoute() {{
                const routePoints = SIMULATION_DATA.route_points || [];
                
                if (routePoints.length > 0) {{
                    if (routeLine) {{
                        map.removeLayer(routeLine);
                    }}
                    
                    const lineColor = SIMULATION_DATA.visualization.line_color;
                    const lineWidth = SIMULATION_DATA.visualization.line_width || 4;
                    
                    routeLine = L.polyline(routePoints, {{
                        color: lineColor,
                        weight: lineWidth,
                        opacity: 0.7,
                        dashArray: SIMULATION_DATA.visualization.dash_array || '10, 10',
                        className: 'animated-path'
                    }}).addTo(map);
                    
                    const shadowLine = L.polyline(routePoints, {{
                        color: '#00000040',
                        weight: lineWidth + 4,
                        opacity: 0.3,
                        dashArray: 'none'
                    }}).addTo(map);
                    
                    trailLine = L.polyline([], {{
                        color: SIMULATION_DATA.visualization.trail_color || lineColor + '80',
                        weight: lineWidth - 2,
                        opacity: 0.5,
                        dashArray: 'none'
                    }}).addTo(map);
                    
                    const bounds = L.latLngBounds(routePoints);
                    map.fitBounds(bounds, {{ padding: [100, 100] }});
                }}
            }}
            
            function updateVehiclePosition(progress) {{
                const routePoints = SIMULATION_DATA.route_points || [];
                
                if (routePoints.length === 0) return;
                
                const progressIndex = Math.floor(progress * (routePoints.length - 1));
                const currentPoint = routePoints[Math.min(progressIndex, routePoints.length - 1)];
                
                if (trailLine) {{
                    const trailPoints = routePoints.slice(0, progressIndex + 1);
                    trailLine.setLatLngs(trailPoints);
                }}
                
                if (!vehicleMarker) {{
                    createVehicleMarker(currentPoint);
                }} else {{
                    vehicleMarker.setLatLng(currentPoint);
                }}
                
                map.panTo(currentPoint, {{ animate: true, duration: 1 }});
                
                updateStats(progress);
            }}
            
            function createVehicleMarker(position) {{
                const vehicleColor = SIMULATION_DATA.vehicle_marker_color;
                const iconHtml = `
                    <div style="
                        width: 30px;
                        height: 30px;
                        background: ${{vehicleColor}};
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 0 15px rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: pulse 1.5s infinite;
                    ">
                        <i class="fas fa-${{SIMULATION_DATA.vehicle_icon}}" style="color: white; font-size: 14px;"></i>
                    </div>
                `;
                
                vehicleMarker = L.marker(position, {{
                    icon: L.divIcon({{
                        className: 'vehicle-marker',
                        html: iconHtml,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    }})
                }}).addTo(map);
                
                vehicleMarker.bindTooltip(
                    `<b>${{SIMULATION_DATA.vehicle_name}}</b><br>
                    Vitesse: ${{SIMULATION_DATA.vehicle_speed}} km/h<br>
                    Progression: ${{Math.round(currentProgress * 100)}}%`,
                    {{ permanent: false, direction: 'top' }}
                );
            }}
            
            function updateStats(progress) {{
                const distanceTraveled = totalDistance * progress;
                const elapsedTime = (distanceTraveled / SIMULATION_DATA.vehicle_speed) * 60;
                const remainingTime = totalTime - elapsedTime;
                
                document.getElementById('distance-traveled').textContent = distanceTraveled.toFixed(1) + ' km';
                document.getElementById('elapsed-time').textContent = Math.floor(elapsedTime) + ' min';
                document.getElementById('average-speed').textContent = SIMULATION_DATA.vehicle_speed + ' km/h';
                document.getElementById('remaining-time').textContent = Math.max(0, Math.ceil(remainingTime)) + ' min';
                
                const progressPercent = (progress * 100).toFixed(1);
                document.getElementById('progress-percent').textContent = progressPercent + '%';
                document.getElementById('progress-fill').style.width = progressPercent + '%';
                
                currentProgress = progress;
            }}
            
            function connectWebSocket() {{
                try {{
                    websocket = new WebSocket(WS_URL);
                    
                    websocket.onopen = function(event) {{
                        console.log('✅ WebSocket connecté');
                        document.getElementById('ws-status').textContent = 'Connecté au serveur temps réel';
                        document.getElementById('ws-status-dot').style.background = '#2ecc71';
                        
                        websocket.send(JSON.stringify({{
                            type: 'connect',
                            simulation_id: SIMULATION_ID,
                            timestamp: new Date().toISOString()
                        }}));
                    }};
                    
                    websocket.onmessage = function(event) {{
                        try {{
                            const data = JSON.parse(event.data);
                            handleWebSocketMessage(data);
                        }} catch (e) {{
                            console.error('Erreur parsing WebSocket:', e);
                        }}
                    }};
                    
                    websocket.onclose = function(event) {{
                        console.log('❌ WebSocket déconnecté');
                        document.getElementById('ws-status').textContent = 'Déconnecté - Reconnexion...';
                        document.getElementById('ws-status-dot').style.background = '#e74c3c';
                        
                        setTimeout(connectWebSocket, 3000);
                    }};
                    
                    websocket.onerror = function(error) {{
                        console.error('WebSocket error:', error);
                    }};
                    
                }} catch (error) {{
                    console.error('Erreur connexion WebSocket:', error);
                }}
            }}
            
            function handleWebSocketMessage(data) {{
                switch(data.type) {{
                    case 'simulation_update':
                        if (data.simulation_id === SIMULATION_ID) {{
                            if (data.status === 'active' && !isSimulating) {{
                                startLocalSimulation();
                            }} else if (data.status === 'paused' && isSimulating) {{
                                pauseLocalSimulation();
                            }} else if (data.status === 'completed') {{
                                completeSimulation();
                            }}
                        }}
                        break;
                        
                    case 'position_update':
                        if (data.simulation_id === SIMULATION_ID && data.position) {{
                            updateVehiclePosition(data.progress || 0);
                        }}
                        break;
                        
                    case 'control_update':
                        showNotification(`Contrôle: ${{data.action}} - ${{data.message}}`);
                        break;
                        
                    case 'simulation_completed':
                        if (data.simulation_id === SIMULATION_ID) {{
                            completeSimulation();
                        }}
                        break;
                }}
            }}
            
            function sendWebSocketControl(action) {{
                if (websocket && websocket.readyState === WebSocket.OPEN) {{
                    websocket.send(JSON.stringify({{
                        type: 'control',
                        action: action,
                        simulation_id: SIMULATION_ID,
                        timestamp: new Date().toISOString()
                    }}));
                }}
            }}
            
            async function startSimulation() {{
                if (isSimulating) return;
                
                isSimulating = true;
                isPaused = false;
                
                sendWebSocketControl('start');
                
                startLocalSimulation();
                
                try {{
                    await fetch(`${{BACKEND_URL}}/api/v1/simulations/${{SIMULATION_ID}}/start`, {{
                        method: 'POST'
                    }});
                }} catch (error) {{
                    console.log('API notification non disponible');
                }}
                
                showNotification('🚀 Simulation démarrée!');
            }}
            
            function startLocalSimulation() {{
                if (simulationInterval) clearInterval(simulationInterval);
                
                simulationInterval = setInterval(() => {{
                    if (currentProgress >= 1.0) {{
                        finishSimulation();
                        return;
                    }}
                    
                    if (!isPaused) {{
                        const increment = 0.005;
                        currentProgress = Math.min(1.0, currentProgress + increment);
                        
                        updateVehiclePosition(currentProgress);
                        
                        if (websocket && websocket.readyState === WebSocket.OPEN) {{
                            const routePoints = SIMULATION_DATA.route_points || [];
                            const progressIndex = Math.floor(currentProgress * (routePoints.length - 1));
                            const currentPoint = routePoints[Math.min(progressIndex, routePoints.length - 1)];
                            
                            websocket.send(JSON.stringify({{
                                type: 'position_update',
                                simulation_id: SIMULATION_ID,
                                progress: currentProgress,
                                position: currentPoint,
                                timestamp: new Date().toISOString()
                            }}));
                        }}
                        
                        lastUpdateTime = Date.now();
                    }}
                }}, 100);
                
                isSimulating = true;
                isPaused = false;
            }}
            
            async function pauseSimulation() {{
                isPaused = !isPaused;
                
                if (isPaused) {{
                    sendWebSocketControl('pause');
                    showNotification('⏸️ Simulation en pause');
                }} else {{
                    sendWebSocketControl('resume');
                    showNotification('▶️ Simulation reprise');
                }}
            }}
            
            async function stopSimulation() {{
                if (simulationInterval) {{
                    clearInterval(simulationInterval);
                    simulationInterval = null;
                }}
                
                isSimulating = false;
                isPaused = false;
                
                sendWebSocketControl('stop');
                showNotification('🛑 Simulation arrêtée');
            }}
            
            function resetSimulation() {{
                stopSimulation();
                currentProgress = 0;
                
                if (trailLine) {{
                    trailLine.setLatLngs([]);
                }}
                
                if (vehicleMarker) {{
                    map.removeLayer(vehicleMarker);
                    vehicleMarker = null;
                }}
                
                updateStats(0);
                
                const routePoints = SIMULATION_DATA.route_points || [];
                if (routePoints.length > 0) {{
                    const bounds = L.latLngBounds(routePoints);
                    map.fitBounds(bounds, {{ padding: [100, 100] }});
                }}
                
                showNotification('🔄 Simulation réinitialisée');
            }}
            
            async function finishSimulation() {{
                stopSimulation();
                simulationCompleted = true;
                
                try {{
                    await fetch(`${{BACKEND_URL}}/api/v1/simulations/${{SIMULATION_ID}}/complete`, {{
                        method: 'POST'
                    }});
                }} catch (error) {{
                    console.log('API notification non disponible');
                }}
                
                if (vehicleMarker) {{
                    let blinkCount = 0;
                    const blinkInterval = setInterval(() => {{
                        if (vehicleMarker.getElement()) {{
                            vehicleMarker.getElement().style.opacity = 
                                vehicleMarker.getElement().style.opacity === '0.5' ? '1' : '0.5';
                            blinkCount++;
                            
                            if (blinkCount >= 6) {{
                                clearInterval(blinkInterval);
                                vehicleMarker.getElement().style.opacity = '1';
                            }}
                        }}
                    }}, 300);
                }}
                
                dashboardButton.classList.add('completed');
                dashboardButton.innerHTML = `
                    <i class="fas fa-tachometer-alt"></i>
                    <span>Simulation Terminée - Voir Tableau de bord React</span>
                    <i class="fas fa-arrow-right" style="margin-left: 5px;"></i>
                `;
                dashboardButton.href = "{dashboard_url}";
                dashboardButton.target = "_blank";
                
                showNotification('🎉 Simulation terminée! Cliquez sur "Tableau de bord React" pour voir les statistiques.');
                
                updateStats(1.0);
            }}
            
            function completeSimulation() {{
                if (!simulationCompleted) {{
                    finishSimulation();
                }}
            }}
            
            function showNotification(message) {{
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(44, 62, 80, 0.95);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                    backdrop-filter: blur(10px);
                    border-left: 4px solid ${{SIMULATION_DATA.vehicle_color}};
                    max-width: 300px;
                `;
                
                notification.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-info-circle" style="color: ${{SIMULATION_DATA.vehicle_color}};"></i>
                        <span>${{message}}</span>
                    </div>
                `;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {{
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }}, 3000);
            }}
            
            document.addEventListener('DOMContentLoaded', function() {{
                initializeMap();
                connectWebSocket();
                
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes slideIn {{
                        from {{ transform: translateX(100%); opacity: 0; }}
                        to {{ transform: translateX(0); opacity: 1; }}
                    }}
                    
                    @keyframes slideOut {{
                        from {{ transform: translateX(0); opacity: 1; }}
                        to {{ transform: translateX(100%); opacity: 0; }}
                    }}
                    
                    @keyframes pulse {{
                        0% {{ transform: scale(1); box-shadow: 0 0 0 0 ${{SIMULATION_DATA.vehicle_color}}80; }}
                        70% {{ transform: scale(1.05); box-shadow: 0 0 0 10px ${{SIMULATION_DATA.vehicle_color}}00; }}
                        100% {{ transform: scale(1); box-shadow: 0 0 0 0 ${{SIMULATION_DATA.vehicle_color}}00; }}
                    }}
                `;
                document.head.appendChild(style);
                
                updateStats(0);
                
                setInterval(async () => {{
                    try {{
                        const response = await fetch(`${{BACKEND_URL}}/api/v1/simulations/${{SIMULATION_ID}}`);
                        if (!response.ok) {{
                            if (response.status === 404) {{
                                console.log('Simulation non trouvée, peut-être archivée');
                                return;
                            }}
                            throw new Error(`HTTP error! status: ${{response.status}}`);
                        }}
                        const data = await response.json();
                        
                        if (data.status === 'active' && !isSimulating) {{
                            startLocalSimulation();
                        }} else if (data.status === 'paused' && isSimulating) {{
                            isPaused = true;
                        }} else if (data.status === 'completed' && !simulationCompleted) {{
                            completeSimulation();
                        }}
                    }} catch (error) {{
                        console.log('État simulation non disponible:', error.message);
                    }}
                }}, 1000);
                
                setInterval(() => {{
                    if (currentProgress >= 1.0 && !dashboardButton.classList.contains('completed')) {{
                        completeSimulation();
                    }}
                }}, 5000);
                
                dashboardButton.addEventListener('click', function() {{
                    localStorage.setItem('last_simulation_id', SIMULATION_ID);
                    localStorage.setItem('last_simulation_data', JSON.stringify(SIMULATION_DATA));
                    
                    window.open("{dashboard_url}", '_blank');
                }});
            }});
        </script>
    </body>
    </html>
    """
    return html

@app.post("/api/v1/drivers/register")
def register_driver(driver: DriverRegistration):
    """Enregistrer un nouveau chauffeur"""
    driver_id = driver.driver_id
    if active_drivers.exists(driver_id):
        raise HTTPException(status_code=400, detail="Chauffeur déjà enregistré")
    
    new_driver = {
        "id": driver_id,
        "name": f"Chauffeur {driver_id[-3:]}",
        "vehicle": driver.vehicle_type,
        "city": "Douala",
        "rating": 4.0,
        "capacity": driver.capacity,
        "status": "active"
    }
    
    active_drivers.add(driver_id)
    drivers_db[driver_id] = new_driver
    vehicle_queue.add_vehicle(driver_id, 4.0, "Douala")
    
    return {"message": "Chauffeur enregistré avec succès", "driver": new_driver}

@app.get("/api/v1/verify-driver/{driver_id}")
def verify_driver(driver_id: str):
    """Vérifier si un chauffeur est actif"""
    exists = active_drivers.exists(driver_id)
    driver_info = drivers_db.get(driver_id)
    
    return {
        "driver_id": driver_id,
        "active": exists,
        "details": driver_info
    }

@app.post("/api/v1/traffic/update")
def update_traffic(update: TrafficUpdate):
    """Mettre à jour les données de trafic"""
    if 0 <= update.hour < 24:
        traffic_delays.update(update.hour, update.delay)
        return {
            "message": f"Trafic mis à jour pour {update.hour}h",
            "hour": update.hour,
            "new_delay": update.delay
        }
    raise HTTPException(status_code=400, detail="Heure invalide (0-23)")

@app.get("/api/v1/status")
def system_status():
    """Statut du système pour le dashboard"""
    try:
        total_routes = sum(len(connections) for connections in city_graph.values()) // 2
        
        return {
            "status": "operational",
            "cities": len(cities),
            "active_drivers": len(drivers_db),
            "available_vehicles": vehicle_queue.size(),
            "active_simulations": len(active_simulations),
            "total_simulations": len(simulation_history) + len(active_simulations),
            "total_routes": total_routes,
            "transport_types": len(TRANSPORT_TYPES),
            "traffic_system": "active",
            "websocket_connections": len(manager.active_connections),
            "algorithms": ["Dijkstra", "Bloom Filter", "Segment Tree", "Min-Heap"],
            "real_time_enabled": True,
            "dashboard_ready": True,
            "frontend_url": "http://localhost:3001",
            "dashboard_url": "http://localhost:3001/dashboard",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/v1/route/advanced")
def plan_advanced_route(request: RouteRequest):
    """Planification d'itinéraire avancée avec préférences"""
    hour = request.hour if request.hour is not None else datetime.now().hour
    
    route_data = find_optimal_route(request.start, request.end, hour, request.preferences)
    if not route_data:
        raise HTTPException(status_code=404, detail="Aucun itinéraire trouvé")
    
    return {
        "start": request.start,
        "end": request.end,
        "preferences": request.preferences,
        "route_data": route_data
    }

@app.get("/api/v1/vehicles/nearest")
def get_nearest_vehicle(city: str):
    """Trouver le véhicule le plus proche d'une ville"""
    nearest = vehicle_queue.get_nearest_vehicle()
    if nearest:
        vehicle_id, location, priority = nearest
        driver_info = drivers_db.get(vehicle_id, {})
        
        return {
            "vehicle_id": vehicle_id,
            "driver": driver_info.get("name"),
            "current_location": location,
            "vehicle_type": driver_info.get("vehicle"),
            "rating": priority,
            "distance_to_city": calculate_city_distance(location, city) if location in cities else "inconnue"
        }
    
    return {"message": "Aucun véhicule disponible"}

@app.get("/api/v1/statistics")
def get_system_statistics():
    """Statistiques du système"""
    total_possible_routes = sum(len(connections) for connections in city_graph.values()) // 2
    
    return {
        "total_cities": len(cities),
        "total_routes": total_possible_routes,
        "active_drivers": len(drivers_db),
        "available_vehicles": vehicle_queue.size(),
        "active_simulations": len(active_simulations),
        "total_simulations": len(simulation_history) + len(active_simulations),
        "transport_types": len(TRANSPORT_TYPES),
        "system_load": "modéré",
        "response_time": "45ms",
        "uptime": "99.9%",
        "websocket_active": len(manager.active_connections) > 0,
        "real_time_enabled": True,
        "frontend_url": "http://localhost:3001",
        "dashboard_url": "http://localhost:3001/dashboard"
    }

def get_recommendations(hour: int, traffic_delay: float):
    """Génère des recommandations basées sur l'heure et le trafic"""
    recommendations = []
    
    if hour >= 22 or hour <= 5:
        recommendations.append("Voyage de nuit - trafic fluide")
    elif traffic_delay > 20:
        recommendations.append("Évitez les heures de pointe (7h-9h, 16h-18h)")
        recommendations.append("Privilégiez les bend-skins pour éviter les embouteillages")
    elif hour in [7, 8, 16, 17, 18]:
        recommendations.append("Heure de pointe - prévoyez plus de temps")
    else:
        recommendations.append("Conditions normales de circulation")
    
    if traffic_delay < 5:
        recommendations.append("Trafic fluide - bon moment pour voyager")
    elif traffic_delay < 15:
        recommendations.append("Trafic modéré - prévoyez un peu plus de temps")
    else:
        recommendations.append("Trafic dense - évitez si possible")
    
    if hour < 6 or hour > 20:
        recommendations.append("Prévoyez un éclairage adéquat")
    
    return recommendations

@app.get("/api/v1/route/{start}/{end}")
def plan_route(start: str, end: str, hour: Optional[int] = None, preferences: Optional[str] = None):
    """Planifier un itinéraire entre deux villes"""
    if hour is None:
        hour = datetime.now().hour
    
    pref_dict = None
    if preferences:
        try:
            pref_dict = json.loads(preferences)
        except:
            pref_dict = {"min_cost": True}
    
    route_data = find_optimal_route(start, end, hour, pref_dict)
    
    if not route_data:
        raise HTTPException(status_code=404, detail="Aucun itinéraire trouvé entre ces villes")
    
    traffic_delay = traffic_delays.query(hour, hour + 1)
    recommendations = get_recommendations(hour, traffic_delay)
    
    return {
        "start": start,
        "end": end,
        "departure_time": f"{hour}h00",
        "total_time": f"{route_data['total_time']} minutes",
        "total_distance": f"{route_data['total_distance']} km",
        "estimated_cost": f"{route_data['estimated_cost']} FCFA",
        "traffic_conditions": "fluide" if traffic_delay < 5 else "modéré" if traffic_delay < 15 else "saturé",
        "traffic_delay": f"{traffic_delay} minutes",
        "recommendations": recommendations,
        "route": route_data["route"],
        "transport_details": route_data["transport_details"],
        "routes_considered": route_data["routes_considered"]
    }

@app.get("/api/v1/dashboard/summary")
def get_dashboard_summary():
    """Résumé pour le dashboard"""
    now = datetime.now()
    active_count = len(active_simulations)
    
    recent_simulations = []
    for sim_id, sim in list(active_simulations.items())[:5]:
        recent_simulations.append({
            "id": sim_id[:10] + "...",
            "route": f"{sim.get('start_city', '?')} → {sim.get('end_city', '?')}",
            "vehicle": sim.get('vehicle_name', 'Inconnu'),
            "progress": f"{sim.get('progress', 0)*100:.1f}%",
            "status": sim.get('status', 'inconnu')
        })
    
    current_hour = now.hour
    traffic_delay = traffic_delays.query(current_hour, current_hour + 1)
    
    return {
        "system_status": "Opérationnel",
        "timestamp": now.isoformat(),
        "current_hour": current_hour,
        "active_simulations": active_count,
        "total_drivers": len(drivers_db),
        "available_vehicles": vehicle_queue.size(),
        "traffic_status": "fluide" if traffic_delay < 5 else "modéré" if traffic_delay < 15 else "saturé",
        "traffic_delay": traffic_delay,
        "recent_simulations": recent_simulations,
        "total_cities": len(cities),
        "web_socket_connections": len(manager.active_connections)
    }

# API pour obtenir des données pour les graphiques
@app.get("/api/v1/analytics/hourly-traffic")
def get_hourly_traffic_data():
    """Données de trafic par heure pour les graphiques"""
    data = []
    for hour in range(24):
        delay = traffic_delays.query(hour, hour + 1)
        status = "fluide" if delay < 5 else "modéré" if delay < 15 else "saturé"
        color = "#2ecc71" if status == "fluide" else "#f39c12" if status == "modéré" else "#e74c3c"
        
        data.append({
            "hour": f"{hour}h",
            "delay": delay,
            "status": status,
            "color": color
        })
    
    return {"hourly_traffic": data}

@app.get("/api/v1/analytics/simulation-stats")
def get_simulation_stats():
    """Statistiques des simulations pour les graphiques"""
    status_count = {
        "active": 0,
        "paused": 0,
        "completed": 0,
        "cancelled": 0
    }
    
    vehicle_counts = {}
    
    for sim in list(active_simulations.values()) + simulation_history:
        status = sim.get("status", "unknown")
        if status in status_count:
            status_count[status] += 1
        
        vehicle_type = sim.get("vehicle_type", "unknown")
        vehicle_counts[vehicle_type] = vehicle_counts.get(vehicle_type, 0) + 1
    
    return {
        "status_distribution": status_count,
        "vehicle_distribution": vehicle_counts,
        "total_simulations": sum(status_count.values())
    }

# API pour le nettoyage des anciennes simulations
@app.post("/api/v1/maintenance/cleanup")
def cleanup_old_simulations(days_old: int = 7):
    """Nettoyer les anciennes simulations de l'historique"""
    if days_old < 1:
        raise HTTPException(status_code=400, detail="Le nombre de jours doit être positif")
    
    cutoff_date = datetime.now() - timedelta(days=days_old)
    initial_count = len(simulation_history)
    
    simulation_history[:] = [
        sim for sim in simulation_history 
        if datetime.fromisoformat(sim.get("created_at", "2000-01-01").replace("Z", "+00:00")) > cutoff_date
    ]
    
    removed_count = initial_count - len(simulation_history)
    
    return {
        "message": f"Maintenance effectuée",
        "removed_simulations": removed_count,
        "remaining_simulations": len(simulation_history),
        "cutoff_date": cutoff_date.isoformat()
    }

# Endpoint pour tester les WebSockets
@app.get("/ws-test")
async def websocket_test():
    """Page de test WebSocket"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test WebSocket</title>
        <script>
            let ws;
            function connect() {
                ws = new WebSocket("ws://localhost:8002/ws/simulation/global");
                
                ws.onopen = function() {
                    console.log("WebSocket connecté");
                    document.getElementById("status").innerHTML = "✅ Connecté";
                    document.getElementById("status").style.color = "green";
                };
                
                ws.onmessage = function(event) {
                    console.log("Message reçu:", event.data);
                    const messages = document.getElementById("messages");
                    const p = document.createElement("p");
                    p.textContent = "Message: " + event.data;
                    messages.appendChild(p);
                };
                
                ws.onclose = function() {
                    console.log("WebSocket déconnecté");
                    document.getElementById("status").innerHTML = "❌ Déconnecté";
                    document.getElementById("status").style.color = "red";
                };
                
                ws.onerror = function(error) {
                    console.error("WebSocket error:", error);
                };
            }
            
            function sendTest() {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "test",
                        message: "Hello from client",
                        timestamp: new Date().toISOString()
                    }));
                }
            }
        </script>
    </head>
    <body>
        <h1>Test WebSocket Smart Transit Cameroon</h1>
        <div>
            <p>Statut: <span id="status" style="font-weight: bold;">Non connecté</span></p>
            <button onclick="connect()">Connecter WebSocket</button>
            <button onclick="sendTest()">Envoyer message test</button>
        </div>
        <div id="messages" style="margin-top: 20px; border: 1px solid #ccc; padding: 10px; max-height: 300px; overflow-y: auto;">
            <p>Messages WebSocket apparaîtront ici...</p>
        </div>
        <div style="margin-top: 20px;">
            <h3>Informations:</h3>
            <ul>
                <li>URL WebSocket: ws://localhost:8002/ws/simulation/global</li>
                <li>Simulations actives: """ + str(len(active_simulations)) + """</li>
                <li>Connexions actives: """ + str(len(manager.active_connections)) + """</li>
            </ul>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# Documentation API personnalisée
@app.get("/api/v1/documentation")
def api_documentation():
    """Documentation de l'API"""
    return {
        "api_name": "Smart Transit Cameroon API",
        "version": "4.0.0",
        "description": "API pour le système de transport intelligent du Cameroun",
        "base_url": "http://localhost:8002",
        "websocket_url": "ws://localhost:8002/ws/simulation/{simulation_id}",
        "frontend_url": "http://localhost:3001",
        "dashboard_url": "http://localhost:3001/dashboard",
        "endpoints": {
            "health": {
                "GET /api/v1/health": "Vérifier l'état du serveur",
                "GET /api/v1/health/frontend": "Vérifier la connexion frontend"
            },
            "system": {
                "GET /api/v1/status": "Statut complet du système",
                "GET /api/v1/statistics": "Statistiques détaillées"
            },
            "simulations": {
                "GET /api/v1/simulations/active": "Liste des simulations actives",
                "POST /api/v1/simulations/create": "Créer une nouvelle simulation",
                "GET /api/v1/simulations/{simulation_id}": "Détails d'une simulation",
                "POST /api/v1/simulations/{simulation_id}/{action}": "Contrôler une simulation",
                "POST /api/v1/simulations/{simulation_id}/complete": "Terminer une simulation"
            },
            "routes": {
                "GET /api/v1/route/{start}/{end}": "Planifier un itinéraire",
                "POST /api/v1/route/advanced": "Planification avancée"
            },
            "traffic": {
                "GET /api/v1/traffic": "Données de trafic par heure",
                "POST /api/v1/traffic/update": "Mettre à jour le trafic"
            },
            "vehicles": {
                "GET /api/v1/vehicles/nearest": "Trouver le véhicule le plus proche",
                "POST /api/v1/drivers/register": "Enregistrer un chauffeur",
                "GET /api/v1/verify-driver/{driver_id}": "Vérifier un chauffeur"
            },
            "analytics": {
                "GET /api/v1/analytics/hourly-traffic": "Données de trafic pour graphiques",
                "GET /api/v1/analytics/simulation-stats": "Statistiques des simulations"
            },
            "cities": {
                "GET /api/v1/cities": "Liste des villes disponibles"
            }
        },
        "features": [
            "Simulations en temps réel avec WebSocket",
            "Visualisation interactive sur carte",
            "Gestion du trafic temps réel",
            "Algorithmes optimisés (Dijkstra, Bloom Filter, etc.)",
            "Dashboard React intégré",
            "API REST complète"
        ],
        "contact": {
            "support": "support@smarttransit-cm.com",
            "documentation": "http://localhost:8002/docs",
            "github": "https://github.com/smart-transit-cameroon"
        }
    }

# Point d'entrée principal pour l'exécution
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 LANCEMENT DE SMART TRANSIT CAMEROON v4.0.0")
    print("=" * 60)
    print(f"📡 Serveur API: http://localhost:8002")
    print(f"📊 Documentation: http://localhost:8002/docs")
    print(f"🌍 Frontend React: http://localhost:3001")
    print(f"📱 Dashboard: http://localhost:3001/dashboard")
    print(f"🔌 WebSocket: ws://localhost:8002/ws/simulation/{{simulation_id}}")
    print("=" * 60)
    print(f"🏙️  Villes disponibles: {len(cities)}")
    print(f"🚗 Types de transport: {len(TRANSPORT_TYPES)}")
    print(f"👨‍✈️  Chauffeurs actifs: {len(drivers_db)}")
    print(f"🗺️  Routes disponibles: {sum(len(v) for v in city_graph.values()) // 2}")
    print("=" * 60)
    print("✅ Serveur prêt! Utilisez Ctrl+C pour arrêter")
    print("=" * 60)
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8001,
        reload=True,
        log_level="info"
    )