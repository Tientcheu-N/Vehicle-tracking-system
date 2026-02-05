import React, { useState, useEffect } from 'react';
import '../styles/ApiStatus.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MetricCard from '../components/MetricCard';
import LoadingSpinner from '../components/LoadingSpinner';

const ApiStatus = () => {
  const [apiStatus, setApiStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallStatus, setOverallStatus] = useState('checking');

  const apis = [
    { id: 'maps', name: 'API Cartes', endpoint: 'https://maps-api.smartpu.com/v1/status', expectedResponseTime: 150 },
    { id: 'routing', name: 'API Routage', endpoint: 'https://routing-api.smartpu.com/v2/health', expectedResponseTime: 200 },
    { id: 'vehicles', name: 'API Véhicules', endpoint: 'https://vehicles-api.smartpu.com/api/status', expectedResponseTime: 100 },
    { id: 'weather', name: 'API Météo', endpoint: 'https://weather-api.smartpu.com/health', expectedResponseTime: 300 },
    { id: 'traffic', name: 'API Trafic', endpoint: 'https://traffic-api.smartpu.com/status', expectedResponseTime: 250 },
    { id: 'analytics', name: 'API Analytique', endpoint: 'https://analytics-api.smartpu.com/healthcheck', expectedResponseTime: 180 },
  ];

  const checkApiStatus = async () => {
    setLoading(true);
    const statusPromises = apis.map(async (api) => {
      const startTime = Date.now();
      try {
        // Simulation de vérification d'API
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
        const responseTime = Date.now() - startTime;
        
        // Simulation aléatoire de statut (90% de succès)
        const isSuccess = Math.random() > 0.1;
        
        return {
          ...api,
          status: isSuccess ? 'up' : 'down',
          responseTime,
          lastChecked: new Date().toLocaleTimeString(),
          uptime: `${(Math.random() * 20 + 80).toFixed(1)}%`,
        };
      } catch (error) {
        return {
          ...api,
          status: 'down',
          responseTime: null,
          lastChecked: new Date().toLocaleTimeString(),
          uptime: '0%',
          error: error.message
        };
      }
    });

    const results = await Promise.all(statusPromises);
    setApiStatus(results);
    
    // Calcul du statut global
    const allUp = results.every(api => api.status === 'up');
    const someDown = results.some(api => api.status === 'down');
    
    if (allUp) setOverallStatus('healthy');
    else if (someDown) setOverallStatus('degraded');
    else setOverallStatus('unhealthy');
    
    setLoading(false);
  };

  useEffect(() => {
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Vérifier toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      case 'degraded': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getOverallStatusColor = () => {
    switch(overallStatus) {
      case 'healthy': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'unhealthy': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="api-status-page">
      <Navbar />
      <div className="container">
        <div className="header-section">
          <h1>Statut des APIs</h1>
          <div className="header-actions">
            <button 
              className="refresh-button"
              onClick={checkApiStatus}
              disabled={loading}
            >
              {loading ? 'Vérification...' : 'Actualiser'}
            </button>
            <div className="overall-status">
              <span className="status-label">Statut Global:</span>
              <span 
                className="status-indicator"
                style={{ backgroundColor: getOverallStatusColor() }}
              >
                {overallStatus === 'healthy' ? 'Tous les systèmes fonctionnent' :
                 overallStatus === 'degraded' ? 'Performances dégradées' :
                 'Système indisponible'}
              </span>
            </div>
          </div>
        </div>

        <div className="metrics-grid">
          <MetricCard
            title="APIs Opérationnelles"
            value={apiStatus.filter(api => api.status === 'up').length}
            total={apis.length}
            trend="positive"
          />
          <MetricCard
            title="Temps de réponse moyen"
            value={`${apiStatus.length > 0 ? (apiStatus.reduce((sum, api) => sum + (api.responseTime || 0), 0) / apiStatus.filter(api => api.responseTime).length).toFixed(0) : '0'}ms`}
            description="Moins de 200ms idéal"
          />
          <MetricCard
            title="Dernière vérification"
            value={apiStatus.length > 0 ? apiStatus[0]?.lastChecked : '--:--'}
          />
          <MetricCard
            title="Disponibilité moyenne"
            value={apiStatus.length > 0 ? `${(apiStatus.reduce((sum, api) => sum + parseFloat(api.uptime || 0), 0) / apiStatus.length).toFixed(1)}%` : '0%'}
            trend="stable"
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Vérification du statut des APIs...</p>
          </div>
        ) : (
          <div className="apis-list">
            <h2>Services API</h2>
            <div className="apis-grid">
              {apiStatus.map((api) => (
                <div key={api.id} className="api-card">
                  <div className="api-header">
                    <h3>{api.name}</h3>
                    <div 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(api.status) }}
                    >
                      {api.status === 'up' ? 'Opérationnel' :
                       api.status === 'down' ? 'Indisponible' : 'Dégradé'}
                    </div>
                  </div>
                  
                  <div className="api-details">
                    <div className="detail-item">
                      <span className="detail-label">Endpoint:</span>
                      <code className="detail-value">{api.endpoint}</code>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Temps de réponse:</span>
                      <span className={`detail-value ${api.responseTime > api.expectedResponseTime ? 'warning' : ''}`}>
                        {api.responseTime ? `${api.responseTime}ms` : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Disponibilité:</span>
                      <span className="detail-value">{api.uptime}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Dernière vérification:</span>
                      <span className="detail-value">{api.lastChecked}</span>
                    </div>
                  </div>
                  
                  <div className="api-actions">
                    <button className="action-button test">Tester</button>
                    <button className="action-button logs">Voir logs</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="system-info">
          <h2>Informations Système</h2>
          <div className="info-grid">
            <div className="info-card">
              <h3>Serveur Principal</h3>
              <p>CPU: 42%</p>
              <p>Mémoire: 67%</p>
              <p>Stockage: 234GB/500GB</p>
            </div>
            <div className="info-card">
              <h3>Base de Données</h3>
              <p>Connexions: 142</p>
              <p>Requêtes/min: 1,245</p>
              <p>Temps réponse: 12ms</p>
            </div>
            <div className="info-card">
              <h3>Cache</h3>
              <p>Hit rate: 94%</p>
              <p>Mémoire utilisée: 2.1GB/4GB</p>
              <p>Objets: 42,156</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ApiStatus;