import React, { useState, useEffect } from 'react';
import '../styles/Cities.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getCities, getCityInfo } from '../services/api';

const Cities = () => {
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    fetchCities(); // CORRECTION: Changé de fetchDrivers à fetchCities
  }, []);

  useEffect(() => {
    filterAndSortCities();
  }, [cities, searchTerm, sortBy]);

  const fetchCities = async () => { // CORRECTION: Fonction renommée
    try {
      setLoading(true);
      const response = await getCities();
      const citiesList = response.data.cities || [];
      
      // Pour chaque ville, récupérer les infos détaillées
      const citiesWithDetails = await Promise.all(
        citiesList.map(async (cityName) => {
          try {
            const cityResponse = await getCityInfo(cityName);
            return {
              name: cityName,
              ...cityResponse.data
            };
          } catch (error) {
            console.error(`Error fetching details for ${cityName}:`, error);
            return {
              name: cityName,
              connections: 5, // Valeur par défaut
              coordinates: { latitude: 0, longitude: 0 }
            };
          }
        })
      );
      
      setCities(citiesWithDetails);
    } catch (error) {
      console.error('Error fetching cities:', error);
      // Données par défaut
      setCities([
        { name: "Douala", connections: 8, coordinates: { latitude: 4.0511, longitude: 9.7679 } },
        { name: "Yaoundé", connections: 7, coordinates: { latitude: 3.8480, longitude: 11.5021 } },
        { name: "Bafoussam", connections: 5, coordinates: { latitude: 5.4770, longitude: 10.4219 } },
        { name: "Bamenda", connections: 4, coordinates: { latitude: 5.9630, longitude: 10.1591 } },
        { name: "Garoua", connections: 3, coordinates: { latitude: 9.3226, longitude: 13.3936 } },
        { name: "Maroua", connections: 3, coordinates: { latitude: 10.5928, longitude: 14.3159 } },
        { name: "Ngaoundéré", connections: 4, coordinates: { latitude: 7.3210, longitude: 13.5839 } },
        { name: "Kumba", connections: 5, coordinates: { latitude: 4.6419, longitude: 9.4388 } },
        { name: "Limbe", connections: 4, coordinates: { latitude: 4.0244, longitude: 9.2140 } },
        { name: "Buea", connections: 3, coordinates: { latitude: 4.1608, longitude: 9.2642 } },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCities = () => {
    let filtered = [...cities];
    
    // Filtrer par recherche
    if (searchTerm) {
      filtered = filtered.filter(city => 
        city.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Trier
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'connections':
          return b.connections - a.connections;
        case 'population':
          return (b.population || 0) - (a.population || 0);
        default:
          return 0;
      }
    });
    
    setFilteredCities(filtered);
  };

  const handleCityClick = async (cityName) => {
    try {
      const response = await getCityInfo(cityName);
      setSelectedCity(response.data);
    } catch (error) {
      console.error('Error fetching city details:', error);
    }
  };

  const getCityColor = (connections) => {
    if (connections >= 7) return '#10b981';
    if (connections >= 5) return '#3b82f6';
    if (connections >= 3) return '#8b5cf6';
    return '#6b7280';
  };

  return (
    <div className="cities-page">
      <Navbar />
      <div className="container">
        <div className="header-section">
          <h1>Cities in Cameroun</h1>
          <div className="header-info">
            <span className="city-count">{cities.length} villes disponibles</span>
            <button className="btn-refresh" onClick={fetchCities}> {/* CORRECTION ICI */}
              🔄 Actualiser
            </button>
          </div>
        </div>

        <div className="controls-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Rechercher une ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="sort-controls">
            <label>Trier par:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">Nom</option>
              <option value="connections">Connexions</option>
              <option value="population">Population</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des villes...</p>
          </div>
        ) : (
          <>
            <div className="cities-grid">
              {filteredCities.map((city, index) => (
                <div 
                  key={city.name} 
                  className="city-card"
                  onClick={() => handleCityClick(city.name)}
                  style={{ 
                    '--delay': `${index * 0.05}s`,
                    borderLeftColor: getCityColor(city.connections || 0)
                  }}
                >
                  <div className="city-header">
                    <h3>{city.name}</h3>
                    <div className="city-badge">
                      {city.connections || 0} connexions
                    </div>
                  </div>
                  
                  <div className="city-details">
                    <div className="coordinate">
                      <span className="label">Latitude:</span>
                      <span className="value">{city.coordinates?.latitude?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="coordinate">
                      <span className="label">Longitude:</span>
                      <span className="value">{city.coordinates?.longitude?.toFixed(4) || 'N/A'}</span>
                    </div>
                    
                    {city.connected_to && city.connected_to.length > 0 && (
                      <div className="connections">
                        <span className="label">Connectée à:</span>
                        <div className="connection-tags">
                          {city.connected_to.slice(0, 3).map((connectedCity, idx) => (
                            <span key={idx} className="connection-tag">
                              {connectedCity}
                            </span>
                          ))}
                          {city.connected_to.length > 3 && (
                            <span className="connection-tag more">
                              +{city.connected_to.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="city-actions">
                    <button 
                      className="action-btn view"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCityClick(city.name);
                      }}
                    >
                      👁️ Voir détails
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredCities.length === 0 && (
              <div className="no-results">
                <p>Aucune ville trouvée pour "{searchTerm}"</p>
              </div>
            )}
          </>
        )}

        {selectedCity && (
          <div className="city-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{selectedCity.name}</h2>
                <button className="close-btn" onClick={() => setSelectedCity(null)}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="city-map">
                  <div className="map-placeholder">
                    <div className="coordinates-display">
                      <div className="coord">
                        <span>🌐 Latitude:</span>
                        <strong>{selectedCity.coordinates?.latitude?.toFixed(4)}</strong>
                      </div>
                      <div className="coord">
                        <span>🌐 Longitude:</span>
                        <strong>{selectedCity.coordinates?.longitude?.toFixed(4)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="city-stats">
                  <div className="stat-card">
                    <h4>Connexions</h4>
                    <div className="stat-value">{selectedCity.connections || 0}</div>
                    <p>Villes connectées</p>
                  </div>
                  
                  <div className="stat-card">
                    <h4>Transport</h4>
                    <div className="stat-value">4</div>
                    <p>Types disponibles</p>
                  </div>
                  
                  <div className="stat-card">
                    <h4>Chauffeurs</h4>
                    <div className="stat-value">12</div>
                    <p>Actifs dans la ville</p>
                  </div>
                </div>
                
                {selectedCity.connected_to && selectedCity.connected_to.length > 0 && (
                  <div className="connections-list">
                    <h3>Villes Connectées</h3>
                    <div className="connections-grid">
                      {selectedCity.connected_to.map((connectedCity, idx) => (
                        <div key={idx} className="connection-item">
                          <span className="city-name">{connectedCity}</span>
                          <span className="distance">~150 km</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="transport-options">
                  <h3>Options de Transport</h3>
                  <div className="transport-types">
                    <div className="transport-type">
                      <span className="icon">🚌</span>
                      <span className="name">Bus</span>
                      <span className="frequency">Toutes les 30 min</span>
                    </div>
                    <div className="transport-type">
                      <span className="icon">🏍️</span>
                      <span className="name">Bend-skin</span>
                      <span className="frequency">Disponible 24/7</span>
                    </div>
                    <div className="transport-type">
                      <span className="icon">🚕</span>
                      <span className="name">Taxi</span>
                      <span className="frequency">Toutes les 15 min</span>
                    </div>
                    <div className="transport-type">
                      <span className="icon">🚐</span>
                      <span className="name">Agence</span>
                      <span className="frequency">Départs horaires</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn-secondary"
                  onClick={() => setSelectedCity(null)}
                >
                  Fermer
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    window.location.href = `/routes?departure=${selectedCity.name}`;
                  }}
                >
                  Planifier un trajet depuis {selectedCity.name}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Cities;