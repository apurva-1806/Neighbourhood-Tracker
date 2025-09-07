import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/auth/AuthForm';
import Layout from './components/Layout';
import Dashboard from './components/dashboard/Dashboard';
import EnergyForecast from './components/forecast/EnergyForecast';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'forecast':
        return <EnergyForecast />;
      case 'energy':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Energy Logs</h2>
            <p className="text-gray-600">Energy logging interface coming soon...</p>
          </div>
        );
      case 'neighborhood':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Neighborhood Overview</h2>
            <p className="text-gray-600">Community dashboard coming soon...</p>
          </div>
        );
      case 'challenges':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Community Challenges</h2>
            <p className="text-gray-600">Challenge system coming soon...</p>
          </div>
        );
      case 'profile':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Settings</h2>
            <p className="text-gray-600">Profile management coming soon...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;