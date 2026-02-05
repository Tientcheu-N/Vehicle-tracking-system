import React from 'react';
import '../styles/MapComponent.css';

const MapComponent = ({ coordinates, routeName }) => {
  return (
    <div className="map-placeholder">
      <div className="map-container">
        <h3>Carte: {routeName}</h3>
        <p style={{ textAlign: 'center', padding: '20px' }}>
          <strong>react-leaflet n'est pas encore installé</strong>
          <br />
          Exécutez : <code>npm install leaflet react-leaflet</code>
        </p>
        <div className="coordinates-preview">
          <h4>Coordonnées :</h4>
          <pre>
            {JSON.stringify(coordinates, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;