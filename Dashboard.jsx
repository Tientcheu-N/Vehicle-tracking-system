import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MetricCard from '../components/MetricCard';
import { getSystemStatus, getSystemStatistics, getTrafficData } from '../services/api';

const Dashboard = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [trafficData, setTrafficData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer toutes les données en parallèle
      const [statusResponse, statsResponse, trafficResponse, citiesResponse] = await Promise.all([
  getSystemStatus(),
  getSystemStatistics(), // UPDATED THIS LINE
  getTrafficData(),
  getCities()
]);

      setSystemStatus(statusResponse.data);
      setStats(statsResponse.data);
      setTrafficData(trafficResponse.data.traffic || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Impossible de charger les données. Vérifiez que le backend est en cours d\'exécution.');
      
      // Données par défaut pour le développement
      setSystemStatus({
        status: 'operational',
        cities: 19,
        active_drivers: 5,
        available_vehicles: 5,
        traffic_system: 'active'
      });
      
      setStats({
        total_cities: 19,
        total_routes: 45,
        active_drivers: 5,
        available_vehicles: 5,
        transport_types: 5,
        system_load: 'modéré',
        response_time: '45ms',
        uptime: '99.9%'
      });
      
      setTrafficData(Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        delay_minutes: i >= 7 && i <= 9 ? 15 : i >= 16 && i <= 18 ? 20 : 5,
        status: i >= 7 && i <= 9 ? 'saturé' : i >= 16 && i <= 18 ? 'saturé' : 'fluide'
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !systemStatus) {
    return (
      <div className="dashboard-page">
        <Navbar />
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement du tableau de bord...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculer les métriques pour les cartes
  const currentHour = new Date().getHours();
  const currentTraffic = trafficData.find(t => t.hour === currentHour) || { delay_minutes: 0, status: 'fluide' };
  
  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="container">
        <div className="header-section">
          <h1>Tableau de Bord SMART PU</h1>
          <div className="status-indicator">
            <span className={`status-dot ${systemStatus?.status === 'operational' ? 'online' : 'offline'}`}></span>
            <span>Système {systemStatus?.status === 'operational' ? 'Opérationnel' : 'En Maintenance'}</span>
            <span className="refresh-time">
              Dernière mise à jour: {new Date().toLocaleTimeString()}
              <button onClick={fetchDashboardData} className="refresh-btn">🔄</button>
            </span>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <p>⚠️ {error}</p>
            <p>Assurez-vous que le backend est en cours d'exécution sur http://localhost:8001</p>
          </div>
        )}

        <div className="metrics-grid">
          <MetricCard
            title="Villes Disponibles"
            value={stats?.total_cities || 19}
            description="Villles du Cameroun"
            trend="stable"
          />
          <MetricCard
            title="Chauffeurs Actifs"
            value={stats?.active_drivers || 5}
            description="Disponibles"
            trend="up"
          />
          <MetricCard
            title="Trafic Actuel"
            value={currentTraffic.status === 'fluide' ? 'Fluide' : currentTraffic.status === 'modéré' ? 'Modéré' : 'Saturé'}
            status={currentTraffic.status}
            description={`Retard: ${currentTraffic.delay_minutes} min`}
          />
          <MetricCard
            title="Temps Réponse"
            value={stats?.response_time || '45ms'}
            description="Performance API"
            trend="stable"
          />
          <MetricCard
            title="Types Transport"
            value={stats?.transport_types || 5}
            description="Bus, Taxi, Bend-skin..."
          />
          <MetricCard
            title="Disponibilité"
            value={stats?.uptime || '99.9%'}
            description="Uptime système"
            trend="up"
          />
        </div>

        <div className="system-info-grid">
          <div className="info-card">
            <h3>📊 Statistiques du Système</h3>
            <div className="info-content">
              <div className="info-item">
                <span className="label">Routes totales:</span>
                <span className="value">{stats?.total_routes || 45}</span>
              </div>
              <div className="info-item">
                <span className="label">Véhicules disponibles:</span>
                <span className="value">{stats?.available_vehicles || 5}</span>
              </div>
              <div className="info-item">
                <span className="label">Charge système:</span>
                <span className={`value ${stats?.system_load === 'élevée' ? 'warning' : 'normal'}`}>
                  {stats?.system_load || 'modéré'}
                </span>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h3>🚦 Trafic par Heure</h3>
            <div className="traffic-chart">
              {trafficData.slice(0, 12).map((item, index) => (
                <div key={index} className="traffic-bar">
                  <div className="bar-time">{item.hour}h</div>
                  <div className="bar-container">
                    <div 
                      className={`bar ${item.status}`}
                      style={{ height: `${Math.min(item.delay_minutes * 2, 100)}%` }}
                    >
                      <span className="bar-label">{item.delay_minutes}min</span>
                    </div>
                  </div>
                  <div className="bar-status">{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Actions Rapides</h3>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => window.location.href = '/routes'}>
              <span className="icon">🗺️</span>
              <span className="text">Planifier un trajet</span>
            </button>
            <button className="action-btn" onClick={() => window.location.href = '/drivers'}>
              <span className="icon">👨‍✈️</span>
              <span className="text">Voir les chauffeurs</span>
            </button>
            <button className="action-btn" onClick={() => window.location.href = '/cities'}>
              <span className="icon">🏙️</span>
              <span className="text">Explorer les villes</span>
            </button>
            <button className="action-btn" onClick={() => window.location.href = '/api-status'}>
              <span className="icon">📡</span>
              <span className="text">Statut API</span>
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;