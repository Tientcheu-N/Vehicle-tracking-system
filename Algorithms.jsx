import React, { useState } from 'react';
import '../styles/Algorithms.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Algorithms = () => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('dijkstra');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const algorithms = [
    { id: 'dijkstra', name: 'Algorithme de Dijkstra', description: 'Trouve le chemin le plus court entre deux points' },
    { id: 'genetic', name: 'Algorithme Génétique', description: 'Optimise les routes en utilisant la sélection naturelle' },
    { id: 'antcolony', name: 'Algorithme de Colonie de Fourmis', description: 'Inspiré du comportement des fourmis pour optimiser les trajets' },
    { id: 'clustering', name: 'Algorithme de Clustering', description: 'Regroupe les points de collecte similaires' },
    { id: 'prediction', name: 'Algorithme de Prédiction', description: 'Prédit les temps de trajet et la demande' },
  ];

  const sampleData = {
    nodes: 15,
    routes: 42,
    efficiency: '87%',
    computationTime: '2.4s'
  };

  const runAlgorithm = () => {
    setIsRunning(true);
    // Simulation d'exécution d'algorithme
    setTimeout(() => {
      setResults({
        optimizedRoutes: 8,
        distanceSaved: '15.7km',
        timeSaved: '45min',
        fuelSaved: '12.4L',
        co2Reduced: '28.3kg'
      });
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="algorithms-page">
      <Navbar />
      <div className="container">
        <h1>Algorithmes d'Optimisation</h1>
        <p className="subtitle">Sélectionnez et exécutez différents algorithmes pour optimiser vos routes de collecte</p>
        
        <div className="algorithms-content">
          <div className="algorithms-list">
            <h2>Algorithmes Disponibles</h2>
            <div className="algorithm-cards">
              {algorithms.map(algo => (
                <div 
                  key={algo.id}
                  className={`algorithm-card ${selectedAlgorithm === algo.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAlgorithm(algo.id)}
                >
                  <h3>{algo.name}</h3>
                  <p>{algo.description}</p>
                  <div className="algorithm-tags">
                    <span className="tag optimization">Optimisation</span>
                    <span className="tag ai">IA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="algorithm-details">
            <div className="details-header">
              <h2>Exécution de l'Algorithme</h2>
              <div className="algorithm-info">
                <span className="algorithm-name">
                  {algorithms.find(a => a.id === selectedAlgorithm)?.name}
                </span>
                <button 
                  className={`run-button ${isRunning ? 'running' : ''}`}
                  onClick={runAlgorithm}
                  disabled={isRunning}
                >
                  {isRunning ? 'Exécution en cours...' : 'Exécuter l\'algorithme'}
                </button>
              </div>
            </div>

            <div className="algorithm-parameters">
              <h3>Paramètres</h3>
              <div className="parameter-grid">
                <div className="parameter">
                  <label>Distance maximale (km)</label>
                  <input type="range" min="10" max="100" defaultValue="50" />
                  <span>50 km</span>
                </div>
                <div className="parameter">
                  <label>Points de collecte maximum</label>
                  <input type="number" defaultValue="15" min="5" max="50" />
                </div>
                <div className="parameter">
                  <label>Heure de début</label>
                  <input type="time" defaultValue="08:00" />
                </div>
                <div className="parameter">
                  <label>Priorité</label>
                  <select defaultValue="distance">
                    <option value="distance">Distance minimale</option>
                    <option value="time">Temps minimal</option>
                    <option value="fuel">Carburant minimal</option>
                  </select>
                </div>
              </div>
            </div>

            {results && (
              <div className="algorithm-results">
                <h3>Résultats de l'Optimisation</h3>
                <div className="results-grid">
                  <div className="result-card">
                    <h4>Routes Optimisées</h4>
                    <p className="result-value">{results.optimizedRoutes}</p>
                  </div>
                  <div className="result-card">
                    <h4>Distance Économisée</h4>
                    <p className="result-value">{results.distanceSaved}</p>
                  </div>
                  <div className="result-card">
                    <h4>Temps Économisé</h4>
                    <p className="result-value">{results.timeSaved}</p>
                  </div>
                  <div className="result-card">
                    <h4>Carburant Économisé</h4>
                    <p className="result-value">{results.fuelSaved}</p>
                  </div>
                  <div className="result-card">
                    <h4>CO₂ Réduit</h4>
                    <p className="result-value">{results.co2Reduced}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="algorithm-statistics">
              <h3>Statistiques de Performance</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Nœuds traités</span>
                  <span className="stat-value">{sampleData.nodes}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Routes analysées</span>
                  <span className="stat-value">{sampleData.routes}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Efficacité</span>
                  <span className="stat-value">{sampleData.efficiency}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Temps de calcul</span>
                  <span className="stat-value">{sampleData.computationTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Algorithms;