import React, { useState, useEffect } from 'react';
import '../styles/Routes.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getCities } from '../services/api'; // Supprimez planAdvancedRoute

const Routes = () => {
  const [routes, setRoutes] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchParams, setSearchParams] = useState({
    start: '',
    end: '',
    hour: new Date().getHours()
  });
  const [planning, setPlanning] = useState(false);
  const [routeResult, setRouteResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const citiesResponse = await getCities();
      setCities(citiesResponse.data.cities || []);
      
      // Récupérer quelques itinéraires prédéfinis
      const predefinedRoutes = [
        {
          id: 1,
          start: "Douala",
          end: "Yaoundé",
          distance: "260 km",
          time: "4h 30min",
          cost: "5,000 XAF",
          transport: ["bus", "agence"],
          popularity: "élevée"
        },
        {
          id: 2,
          start: "Yaoundé",
          end: "Bafoussam",
          distance: "280 km",
          time: "5h",
          cost: "4,500 XAF",
          transport: ["bus", "agence"],
          popularity: "moyenne"
        },
        {
          id: 3,
          start: "Douala",
          end: "Bafoussam",
          distance: "220 km",
          time: "4h",
          cost: "4,000 XAF",
          transport: ["bus"],
          popularity: "élevée"
        },
        {
          id: 4,
          start: "Bamenda",
          end: "Garoua",
          distance: "850 km",
          time: "12h",
          cost: "12,000 XAF",
          transport: ["bus", "agence", "train"],
          popularity: "faible"
        },
        {
          id: 5,
          start: "Maroua",
          end: "Ngaoundéré",
          distance: "450 km",
          time: "7h",
          cost: "7,500 XAF",
          transport: ["bus", "agence"],
          popularity: "moyenne"
        }
      ];
      setRoutes(predefinedRoutes);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanRoute = async () => {
    if (!searchParams.start || !searchParams.end) {
      alert('Veuillez sélectionner les villes de départ et d\'arrivée');
      return;
    }

    try {
      setPlanning(true);
      // Utilisez une simulation car l'API réelle nécessite un backend
      // En attendant, on simule une réponse
      const simulatedResponse = {
        data: {
          start: searchParams.start,
          end: searchParams.end,
          departure_hour: searchParams.hour,
          current_traffic: searchParams.hour >= 7 && searchParams.hour <= 9 ? 15 : 5,
          route: [searchParams.start, searchParams.end],
          total_time: 300, // 5 heures
          total_distance: 250,
          estimated_cost: 5000,
          recommendations: [
            "Voyage de jour - visibilité optimale",
            "Privilégiez les agences pour plus de confort",
            "Réservez votre billet à l'avance"
          ]
        }
      };
      
      setRouteResult(simulatedResponse.data);
    } catch (error) {
      console.error('Error planning route:', error);
      alert('Erreur lors de la planification du trajet');
    } finally {
      setPlanning(false);
    }
  };

  const getPopularityColor = (popularity) => {
    switch(popularity) {
      case 'élevée': return '#10b981';
      case 'moyenne': return '#f59e0b';
      case 'faible': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const getTransportIcons = (transportTypes) => {
    const icons = {
      'bus': '🚌',
      'taxi': '🚕',
      'bend-skin': '🏍️',
      'agence': '🚐',
      'train': '🚆'
    };
    
    return transportTypes?.map(type => icons[type] || '🚗').join(' ') || '🚗';
  };

  return (
    <div className="routes-page">
      <Navbar />
      <div className="container">
        <div className="header-section">
          <h1>Planificateur d'Itinéraires</h1>
          <div className="header-stats">
            <span className="stat">{cities.length} villes</span>
            <span className="stat">{routes.length} itinéraires</span>
          </div>
        </div>

        <div className="planning-section">
          <div className="planning-card">
            <h2>Planifier un Nouvel Itinéraire</h2>
            <div className="planning-form">
              <div className="form-group">
                <label>Ville de départ:</label>
                <select
                  value={searchParams.start}
                  onChange={(e) => setSearchParams({...searchParams, start: e.target.value})}
                  className="city-select"
                >
                  <option value="">Sélectionnez une ville</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Ville d'arrivée:</label>
                <select
                  value={searchParams.end}
                  onChange={(e) => setSearchParams({...searchParams, end: e.target.value})}
                  className="city-select"
                >
                  <option value="">Sélectionnez une ville</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Heure de départ:</label>
                <div className="hour-input-group">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={searchParams.hour}
                    onChange={(e) => setSearchParams({...searchParams, hour: parseInt(e.target.value)})}
                    className="hour-input"
                  />
                  <span className="hour-label">h</span>
                </div>
              </div>
              
              <button 
                className="plan-btn"
                onClick={handlePlanRoute}
                disabled={planning}
              >
                {planning ? 'Planification...' : 'Planifier le trajet'}
              </button>
            </div>
          </div>

          {routeResult && (
            <div className="route-result-card">
              <h3>Résultat du Trajet</h3>
              <div className="result-details">
                <div className="result-row">
                  <span className="label">Départ:</span>
                  <span className="value">{routeResult.start}</span>
                </div>
                <div className="result-row">
                  <span className="label">Arrivée:</span>
                  <span className="value">{routeResult.end}</span>
                </div>
                <div className="result-row">
                  <span className="label">Temps total:</span>
                  <span className="value">{Math.floor(routeResult.total_time / 60)}h {routeResult.total_time % 60}min</span>
                </div>
                <div className="result-row">
                  <span className="label">Distance:</span>
                  <span className="value">{routeResult.total_distance} km</span>
                </div>
                <div className="result-row">
                  <span className="label">Coût estimé:</span>
                  <span className="value">{routeResult.estimated_cost} XAF</span>
                </div>
                {routeResult.recommendations && (
                  <div className="result-recommendations">
                    <h4>Recommandations:</h4>
                    <ul>
                      {routeResult.recommendations.map((rec, idx) => (
                        <li key={idx}>✓ {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="routes-section">
          <h2>Itinéraires Populaires</h2>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Chargement des itinéraires...</p>
            </div>
          ) : (
            <div className="routes-grid">
              {routes.map(route => (
                <div 
                  key={route.id}
                  className={`route-card ${selectedRoute?.id === route.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRoute(route)}
                >
                  <div className="route-header">
                    <h3>{route.start} → {route.end}</h3>
                    <div 
                      className="popularity-badge"
                      style={{ backgroundColor: getPopularityColor(route.popularity) }}
                    >
                      {route.popularity}
                    </div>
                  </div>
                  
                  <div className="route-details">
                    <div className="detail-item">
                      <span className="icon">📏</span>
                      <span className="value">{route.distance}</span>
                      <span className="label">Distance</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">⏱️</span>
                      <span className="value">{route.time}</span>
                      <span className="label">Durée</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">💰</span>
                      <span className="value">{route.cost}</span>
                      <span className="label">Coût</span>
                    </div>
                  </div>
                  
                  <div className="route-transport">
                    <span className="label">Transport:</span>
                    <span className="transport-icons">
                      {getTransportIcons(route.transport)}
                    </span>
                  </div>
                  
                  <button 
                    className="select-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchParams({
                        start: route.start,
                        end: route.end,
                        hour: new Date().getHours()
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Sélectionner cet itinéraire
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Routes;