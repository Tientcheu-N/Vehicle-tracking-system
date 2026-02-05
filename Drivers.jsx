import React, { useState, useEffect } from 'react';
import '../styles/Drivers.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getDrivers, verifyDriver } from '../services/api';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await getDrivers();
      setDrivers(response.data.drivers || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      // Données par défaut
      setDrivers([
        {
          id: "DRV001",
          name: "Jean Mbarga",
          vehicle: "bus",
          city: "Douala",
          rating: 4.5,
          status: "active",
          trips_completed: 124,
          total_distance: "2,450 km"
        },
        {
          id: "DRV002",
          name: "Marie Ngo",
          vehicle: "taxi",
          city: "Yaoundé",
          rating: 4.8,
          status: "active",
          trips_completed: 98,
          total_distance: "1,890 km"
        },
        {
          id: "DRV003",
          name: "Pierre Fotso",
          vehicle: "bend-skin",
          city: "Bafoussam",
          rating: 4.2,
          status: "active",
          trips_completed: 156,
          total_distance: "3,120 km"
        },
        {
          id: "DRV004",
          name: "Alice Kamga",
          vehicle: "agence",
          city: "Douala",
          rating: 4.7,
          status: "on_break",
          trips_completed: 87,
          total_distance: "1,740 km"
        },
        {
          id: "DRV005",
          name: "David Mvogo",
          vehicle: "train",
          city: "Yaoundé",
          rating: 4.9,
          status: "offline",
          trips_completed: 65,
          total_distance: "1,300 km"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDriver = async (driverId) => {
    try {
      setVerifying(true);
      const response = await verifyDriver(driverId);
      alert(`Chauffeur vérifié: ${response.data.details?.name || driverId}`);
      
      // Mettre à jour le statut localement
      setDrivers(prev => prev.map(driver => 
        driver.id === driverId 
          ? { ...driver, verified: true, verification_date: new Date().toISOString() }
          : driver
      ));
    } catch (error) {
      console.error('Error verifying driver:', error);
      alert('Erreur lors de la vérification du chauffeur');
    } finally {
      setVerifying(false);
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

  const getStatusText = (status) => {
    switch(status) {
      case 'active': return 'En service';
      case 'on_break': return 'En pause';
      case 'offline': return 'Hors ligne';
      default: return status;
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    if (filter === 'all') return true;
    return driver.status === filter;
  });

  return (
    <div className="drivers-page">
      <Navbar />
      <div className="container">
        <div className="header-section">
          <h1>Gestion des Chauffeurs</h1>
          <div className="header-actions">
            <button className="btn-primary" onClick={fetchDrivers}>
              Rafraîchir
            </button>
            <span className="driver-count">
              {drivers.length} chauffeur{drivers.length > 1 ? 's' : ''} actif{drivers.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-tabs">
            {['all', 'active', 'on_break', 'offline'].map(status => (
              <button
                key={status}
                className={`filter-tab ${filter === status ? 'active' : ''}`}
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? 'Tous' :
                 status === 'active' ? 'En service' :
                 status === 'on_break' ? 'En pause' : 'Hors ligne'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des chauffeurs...</p>
          </div>
        ) : (
          <div className="drivers-grid">
            {filteredDrivers.map(driver => (
              <div 
                key={driver.id} 
                className={`driver-card ${selectedDriver?.id === driver.id ? 'selected' : ''}`}
                onClick={() => setSelectedDriver(driver)}
              >
                <div className="driver-header">
                  <div className="driver-avatar">
                    <span className="avatar-icon">👨‍✈️</span>
                  </div>
                  <div className="driver-info">
                    <h3>{driver.name}</h3>
                    <div className="driver-id">{driver.id}</div>
                    <div className="driver-location">
                      📍 {driver.city}
                    </div>
                  </div>
                  <div className="driver-rating">
                    <span className="star">⭐</span>
                    <span className="rating-value">{driver.rating}</span>
                  </div>
                </div>

                <div className="driver-details">
                  <div className="detail-item">
                    <span className="label">Véhicule:</span>
                    <span className="value">
                      {getVehicleIcon(driver.vehicle)} {driver.vehicle}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Statut:</span>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(driver.status) }}
                    >
                      {getStatusText(driver.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Trajets:</span>
                    <span className="value">{driver.trips_completed || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Distance:</span>
                    <span className="value">{driver.total_distance || 'N/A'}</span>
                  </div>
                </div>

                <div className="driver-actions">
                  <button 
                    className="action-btn verify"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVerifyDriver(driver.id);
                    }}
                    disabled={verifying}
                  >
                    {verifying ? 'Vérification...' : 'Vérifier'}
                  </button>
                  <button 
                    className="action-btn details"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDriver(driver);
                    }}
                  >
                    Détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedDriver && (
          <div className="driver-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Détails du Chauffeur</h2>
                <button className="close-btn" onClick={() => setSelectedDriver(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="driver-profile">
                  <div className="profile-header">
                    <div className="profile-avatar">👨‍✈️</div>
                    <div>
                      <h3>{selectedDriver.name}</h3>
                      <p>ID: {selectedDriver.id}</p>
                    </div>
                  </div>
                  <div className="profile-details">
                    <div className="detail-row">
                      <span className="label">Ville:</span>
                      <span className="value">{selectedDriver.city}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Véhicule:</span>
                      <span className="value">{getVehicleIcon(selectedDriver.vehicle)} {selectedDriver.vehicle}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Note:</span>
                      <span className="value">⭐ {selectedDriver.rating}/5</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Statut:</span>
                      <span className={`value ${selectedDriver.status}`}>
                        {getStatusText(selectedDriver.status)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Trajets complétés:</span>
                      <span className="value">{selectedDriver.trips_completed || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Distance totale:</span>
                      <span className="value">{selectedDriver.total_distance || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn-secondary"
                  onClick={() => setSelectedDriver(null)}
                >
                  Fermer
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    handleVerifyDriver(selectedDriver.id);
                    setSelectedDriver(null);
                  }}
                >
                  Vérifier ce chauffeur
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

export default Drivers;