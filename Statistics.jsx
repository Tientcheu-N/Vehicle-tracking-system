import React, { useState, useEffect } from 'react';
import '../styles/Statistics.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MetricCard from '../components/MetricCard';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    // Simulation de chargement de données
    setTimeout(() => {
      setStats({
        totalDistance: '1,245 km',
        totalTrips: 42,
        avgSpeed: '38 km/h',
        fuelConsumed: '245 L',
        co2Saved: '1.2 tons',
        efficiency: '87%',
        activeDrivers: 8,
        vehiclesActive: 5,
        monthlyData: [
          { month: 'Jan', distance: 1200, trips: 35 },
          { month: 'Feb', distance: 1400, trips: 42 },
          { month: 'Mar', distance: 1600, trips: 48 },
          { month: 'Apr', distance: 1800, trips: 52 },
          { month: 'May', distance: 2000, trips: 58 },
          { month: 'Jun', distance: 2200, trips: 62 },
        ]
      });
      setLoading(false);
    }, 1000);
  }, [timeRange]);

  return (
    <div className="statistics-page">
      <Navbar />
      <div className="container">
        <div className="header-section">
          <h1>Statistiques</h1>
          <div className="time-range-selector">
            <button 
              className={`time-btn ${timeRange === 'day' ? 'active' : ''}`}
              onClick={() => setTimeRange('day')}
            >
              Jour
            </button>
            <button 
              className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
              onClick={() => setTimeRange('week')}
            >
              Semaine
            </button>
            <button 
              className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
              onClick={() => setTimeRange('month')}
            >
              Mois
            </button>
            <button 
              className={`time-btn ${timeRange === 'year' ? 'active' : ''}`}
              onClick={() => setTimeRange('year')}
            >
              Année
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des statistiques...</p>
          </div>
        ) : (
          <>
            <div className="metrics-grid">
              <MetricCard
                title="Distance Totale"
                value={stats.totalDistance}
                description={`Sur ${timeRange === 'day' ? '24h' : timeRange === 'week' ? '7 jours' : timeRange === 'month' ? '30 jours' : '365 jours'}`}
                trend="up"
              />
              <MetricCard
                title="Trajets Effectués"
                value={stats.totalTrips}
                description="Nombre total"
                trend="stable"
              />
              <MetricCard
                title="Vitesse Moyenne"
                value={stats.avgSpeed}
                description="Moyenne globale"
              />
              <MetricCard
                title="Carburant Consommé"
                value={stats.fuelConsumed}
                description="Consommation totale"
                trend="down"
              />
              <MetricCard
                title="CO₂ Économisé"
                value={stats.co2Saved}
                description="Impact environnemental"
                trend="up"
              />
              <MetricCard
                title="Efficacité"
                value={stats.efficiency}
                description="Taux d'optimisation"
              />
            </div>

            <div className="charts-section">
              <div className="chart-card">
                <h3>Distance Parcourue par Mois</h3>
                <div className="chart-container">
                  <div className="bar-chart">
                    {stats.monthlyData.map((item, index) => (
                      <div key={index} className="bar-group">
                        <div className="bar-label">{item.month}</div>
                        <div className="bar-container">
                          <div 
                            className="bar" 
                            style={{ height: `${(item.distance / 2500) * 100}%` }}
                          >
                            <span className="bar-value">{item.distance} km</span>
                          </div>
                        </div>
                        <div className="bar-trips">{item.trips} trajets</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h3>Répartition des Trajets</h3>
                <div className="pie-chart-container">
                  <div className="pie-chart">
                    <div className="pie-segment" style={{ '--percentage': '40%', '--color': '#3b82f6' }}>
                      <div className="segment-label">Transport Public</div>
                    </div>
                    <div className="pie-segment" style={{ '--percentage': '25%', '--color': '#10b981' }}>
                      <div className="segment-label">Livraison</div>
                    </div>
                    <div className="pie-segment" style={{ '--percentage': '20%', '--color': '#8b5cf6' }}>
                      <div className="segment-label">Collecte</div>
                    </div>
                    <div className="pie-segment" style={{ '--percentage': '15%', '--color': '#f59e0b' }}>
                      <div className="segment-label">Maintenance</div>
                    </div>
                  </div>
                  <div className="pie-legend">
                    <div className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
                      <span>Transport Public (40%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                      <span>Livraison (25%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></span>
                      <span>Collecte (20%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                      <span>Maintenance (15%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="detailed-stats">
              <h2>Statistiques Détaillées</h2>
              <div className="stats-table">
                <div className="table-row header">
                  <div className="cell">Métrique</div>
                  <div className="cell">Valeur</div>
                  <div className="cell">Tendance</div>
                  <div className="cell">Évolution</div>
                </div>
                <div className="table-row">
                  <div className="cell">Heures de Conduite</div>
                  <div className="cell">245 h</div>
                  <div className="cell"><span className="trend-up">↑ 12%</span></div>
                  <div className="cell">+26 h</div>
                </div>
                <div className="table-row">
                  <div className="cell">Arrêts Moyens</div>
                  <div className="cell">8.5 / trajet</div>
                  <div className="cell"><span className="trend-down">↓ 5%</span></div>
                  <div className="cell">-0.4</div>
                </div>
                <div className="table-row">
                  <div className="cell">Retards</div>
                  <div className="cell">3.2%</div>
                  <div className="cell"><span className="trend-down">↓ 15%</span></div>
                  <div className="cell">-0.6%</div>
                </div>
                <div className="table-row">
                  <div className="cell">Satisfaction</div>
                  <div className="cell">4.7/5</div>
                  <div className="cell"><span className="trend-up">↑ 8%</span></div>
                  <div className="cell">+0.3</div>
                </div>
                <div className="table-row">
                  <div className="cell">Coût au Km</div>
                  <div className="cell">€0.85</div>
                  <div className="cell"><span className="trend-down">↓ 7%</span></div>
                  <div className="cell">-€0.06</div>
                </div>
              </div>
            </div>

            <div className="insights-section">
              <h2>Insights et Recommandations</h2>
              <div className="insights-grid">
                <div className="insight-card positive">
                  <h4>✅ Performance Optimale</h4>
                  <p>L'efficacité des routes a augmenté de 15% ce mois-ci grâce à l'optimisation des algorithmes.</p>
                </div>
                <div className="insight-card warning">
                  <h4>⚠️ Zone à Améliorer</h4>
                  <p>Le trafic entre 8h et 10h réduit la vitesse moyenne de 22%. Considérez des routes alternatives.</p>
                </div>
                <div className="insight-card info">
                  <h4>📊 Opportunité</h4>
                  <p>L'ajout de 2 véhicules électriques pourrait réduire les coûts de carburant de 18%.</p>
                </div>
                <div className="insight-card suggestion">
                  <h4>💡 Suggestion</h4>
                  <p>Intégrer la météo dans les algorithmes pour améliorer la précision des temps de trajet de 12%.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Statistics;