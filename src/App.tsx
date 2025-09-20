import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Registros } from './components/Registros';
import { Historico } from './components/Historico';
import { Relatorios } from './components/Relatorios';
import { Login } from './components/Login';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App;
