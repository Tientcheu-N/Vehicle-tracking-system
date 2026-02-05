import React, { useState, useEffect } from 'react';
import '../styles/LiveTracking.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getTrafficData, getDrivers, getNearestVehicle } from '../services/api';

const LiveTracking = () => {
  const [trafficData, setTrafficData] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulationActive, setSimulationActive] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      if (simulationActive) {
        updateSimulation();
      }
    }, 5000); // Mise à jour toutes les 5 secondes

    return () => clearInterval(interval);
  }, [simulationActive]);

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      const [trafficResponse, driversResponse] = await Promise.all([
        getTrafficData(),
        getDrivers()
      ]);

      setTrafficData(trafficResponse.data.traffic || []);
      const driversList = driversResponse.data.drivers || [];
      
      // Ajouter des données de position simulées
      const driversWithPositions = driversList.map(driver => ({
        ...driver,
        position: {
          lat: Math.random() * 0.5 + 3.5, // Latitude approximative Cameroun
          lng: Math.random() * 2 + 9,     // Longitude approximative Cameroun
        },
        speed: Math.floor(Math.random() * 60) + 20,
        status: ['active', 'on_break', 'offline'][Math.floor(Math.random() * 3)],
        lastUpdate: new Date().toISOString()
      }));

      setDrivers(driversWithPositions);
    } catch (error) {
      console.error('Error fetching live data:', error);
      // Données par défaut
      setTrafficData(Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        delay_minutes: Math.floor(Math.random() * 30),
        status: ['fluide', 'modéré', 'saturé'][Math.floor(Math.random() * 3)]
      })));
      
      setDrivers([
        {
          id: "DRV001",
          name: "Jean Mbarga",
          vehicle: "bus",
          city: "Douala",
          rating: 4.5,
          position: { lat: 4.0511, lng: 9.7679 },
          speed: 45,
          status: 'active',
          route: "Douala → Yaoundé",
          passengers: 32
        },
        // ... autres drivers
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateSimulation = () => {
    setDrivers(prev => prev.map(driver => {
      if (driver.status === 'active') {
        // Mettre à jour la position légèrement
        const newLat = driver.position.lat + (Math.random() - 0.5) * 0.01;
        const newLng = driver.position.lng + (Math.random() - 0.5) * 0.01;
        
        return {
          ...driver,
          position: { lat: newLat, lng: newLng },
          speed: Math.max(10, Math.min(80, driver.speed + (Math.random() - 0.5) * 10)),
          lastUpdate: new Date().toISOString()
        };
      }
      return driver;
    }));
  };

  const handleFindNearestVehicle = async () => {
    try {
      const response = await getNearestVehicle('Douala');
      alert(`Véhicule le plus proche: ${response.data.driver || 'N/A'}`);
    } catch (error) {
      console.error('Error finding nearest vehicle:', error);
    }
  };

  const getVehicleIcon = (vehicleType) => {
    switch(vehicleType) {
      case 'bus': return '🚌';
      case 'taxi': return '🚕';
      case 'bend-skin': return '🏍️';
      case 'agence': return '🚐';
      case 'train': return '🚆';
      default: return '🚗';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'on_break': return '#f59e0b';
      case 'offline': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    if (filter === 'all') return true;
    return driver.vehicle === filter;
  });

  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const totalDistance = drivers.reduce((sum, d) => sum + (d.distance_traveled || 0), 0);
  const averageSpeed = drivers.length > 0 
    ? Math.round(drivers.reduce((sum, d) => sum + d.speed, 0) / drivers.length)
    : 0;

  return (
    <div className="live-tracking-page">
      <Navbar />
      <div className="container">
        <div className="header-section">
          <div className="header-left">
            <h1>Suivi en Temps Réel</h1>
            <div className="current-time">
              ⏰ {currentTime.toLocaleTimeString()}
            </div>
          </div>
          <div className="header-controls">
            <button 
              className={`simulation-btn ${simulationActive ? 'active' : ''}`}
              onClick={() => setSimulationActive(!simulationActive)}
            >
              {simulationActive ? '⏸️ Pause' : '▶️ Simulation'}
            </button>
            <button className="refresh-btn" onClick={fetchLiveData}>
              🔄 Actualiser
            </button>
            <button className="find-vehicle-btn" onClick={handleFindNearestVehicle}>
              🔍 Véhicule proche
            </button>
          </div>
        </div>

        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-icon">🚗</div>
            <div className="metric-content">
              <div className="metric-value">{drivers.length}</div>
              <div className="metric-label">Véhicules suivis</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">⚡</div>
            <div className="metric-content">
              <div className="metric-value">{activeDrivers}</div>
              <div className="metric-label">En mouvement</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📏</div>
            <div className="metric-content">
              <div className="metric-value">{totalDistance} km</div>
              <div className="metric-label">Distance totale</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🏎️</div>
            <div className="metric-content">
              <div className="metric-value">{averageSpeed} km/h</div>
              <div className="metric-label">Vitesse moyenne</div>
            </div>
          </div>
        </div>

        <div className="main-content">
          <div className="map-section">
            <div className="map-header">
              <h2>Carte de Suivi</h2>
              <div className="map-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
                  <span>En service</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span>En pause</span>
                </div>
              </div>
            </div>
            <div className="map-container">
              <div className="map-placeholder">
                <div className="map-coordinates">
                  <h3>Position des véhicules</h3>
                  <p>Latitude: 3.8480° - 10.5928°</p>
                  <p>Longitude: 9.2140° - 14.3159°</p>
                </div>
                <div className="vehicle-markers">
                  {filteredDrivers.slice(0, 5).map((driver, index) => (
                    <div 
                      key={driver.id}
                      className="vehicle-marker"
                      style={{
                        left: `${20 + index * 15}%`,
                        top: `${30 + (index % 3) * 20}%`,
                        backgroundColor: getStatusColor(driver.status)
                      }}
                      title={`${driver.name} - ${driver.vehicle}`}
                    >
                      {getVehicleIcon(driver.vehicle)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="map-stats">
              <div className="stat">
                <span>Précision GPS:</span>
                <span className="value">±10 m</span>
              </div>
              <div className="stat">
                <span>Dernière mise à jour:</span>
                <span className="value">{currentTime.toLocaleTimeString()}</span>
              </div>
              <div className="stat">
                <span>Latence:</span>
                <span className="value">250 ms</span>
              </div>
            </div>
          </div>

          <div className="vehicles-section">
            <div className="section-header">
              <h2>Véhicules en Direct</h2>
              <div className="filter-tabs">
                {['all', 'bus', 'taxi', 'bend-skin', 'agence'].map(type => (
                  <button
                    key={type}
                    className={`filter-tab ${filter === type ? 'active' : ''}`}
                    onClick={() => setFilter(type)}
                  >
                    {type === 'all' ? 'Tous' : 
                     type === 'bend-skin' ? 'Motos' : type}
                  </button>
                ))}
              </div>
            </div>

            <div className="vehicles-list">
              {loading ? (
                <div className="loading">Chargement...</div>
              ) : (
                filteredDrivers.map(driver => (
                  <div 
                    key={driver.id}
                    className={`vehicle-card ${selectedVehicle?.id === driver.id ? 'selected' : ''}`}
                    onClick={() => setSelectedVehicle(driver)}
                  >
                    <div className="vehicle-header">
                      <div className="vehicle-icon">
                        {getVehicleIcon(driver.vehicle)}
                      </div>
                      <div className="vehicle-info">
                        <h3>{driver.name}</h3>
                        <div className="vehicle-id">{driver.id}</div>
                      </div>
                      <div 
                        className="status-indicator"
                        style={{ backgroundColor: getStatusColor(driver.status) }}
                      >
                        {driver.status === 'active' ? 'En ligne' : 
                         driver.status === 'on_break' ? 'Pause' : 'Hors ligne'}
                      </div>
                    </div>

                    <div className="vehicle-details">
                      <div className="detail-row">
                        <span className="label">Position:</span>
                        <span className="value">
                          {driver.position?.lat?.toFixed(4)}, {driver.position?.lng?.toFixed(4)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Vitesse:</span>
                        <span className="value">{driver.speed} km/h</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Destination:</span>
                        <span className="value">{driver.route || driver.city}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Dernière mise à jour:</span>
                        <span className="value">
                          {new Date(driver.lastUpdate).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="vehicle-actions">
                      <button className="action-btn track">
                        📍 Suivre
                      </button>
                      <button className="action-btn details">
                        ℹ️ Détails
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="traffic-section">
          <h2>Trafic en Temps Réel</h2>
          <div className="traffic-grid">
            {trafficData.slice(currentTime.getHours(), currentTime.getHours() + 6).map((traffic, index) => (
              <div key={index} className="traffic-card">
                <div className="traffic-hour">{traffic.hour}h</div>
                <div className="traffic-status">
                  <div className={`status-indicator ${traffic.status}`}>
                    {traffic.status}
                  </div>
                </div>
                <div className="traffic-delay">
                  <span className="delay-value">{traffic.delay_minutes} min</span>
                  <span className="delay-label">retard</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LiveTracking;