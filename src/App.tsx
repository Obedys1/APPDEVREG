import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Registros } from './components/Registros';
import { Historico } from './components/Historico';
import { Relatorios } from './components/Relatorios';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { session, loading } = useAuth();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'registros':
        return <Registros />;
      case 'historico':
        return <Historico />;
      case 'relatorios':
        return <Relatorios />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-brand-background flex items-center justify-center"><p className="text-brand-primary">Carregando...</p></div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-brand-background">
        {!session ? (
          <Login />
        ) : (
          <Layout 
            currentPage={currentPage} 
            onPageChange={setCurrentPage}
          >
            {renderCurrentPage()}
          </Layout>
        )}
        <Toaster position="top-right" />
      </div>
    </Router>
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
