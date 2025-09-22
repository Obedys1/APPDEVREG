import React, { useState } from 'react';
import { BarChart3, FileText, History, Plus, Menu, User, LogOut, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { LOGO_URL } from '../config';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'registros', label: 'Registrar devolução', icon: Plus },
  { id: 'ocorrencias', label: 'Registrar ocorrência', icon: FileWarning },
  { id: 'historico-devolucoes', label: 'Histórico devoluções', icon: History },
  { id: 'historico-ocorrencias', label: 'Histórico ocorrências', icon: History },
  { id: 'relatorios-devolucoes', label: 'Relatórios devoluções', icon: FileText },
  { id: 'relatorios-ocorrencias', label: 'Relatórios ocorrências', icon: FileText },
];

const sidebarVariants = {
  open: { x: 0 },
  closed: { x: '-100%' },
};

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair: ' + error.message);
    } else {
      toast.success('Você saiu com sucesso!');
    }
  };

  const NavItem: React.FC<{ item: typeof menuItems[0] }> = ({ item }) => (
    <button
      onClick={() => {
        onPageChange(item.id);
        setSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-colors duration-200 rounded-lg ${
        currentPage === item.id
          ? 'bg-brand-secondary/20 text-brand-secondary font-semibold'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      <span>{item.label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-brand-background">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={sidebarVariants}
        initial="closed"
        animate={sidebarOpen ? 'open' : 'closed'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-50 w-72 bg-brand-primary flex flex-col lg:!translate-x-0"
      >
        <div className="flex items-center justify-center h-24 px-6 flex-shrink-0">
          <img src={LOGO_URL} alt="Grupo Doce Mel Logo" className="h-20" />
        </div>
        <nav className="flex-grow px-4 py-4 space-y-2">
          {menuItems.map(item => <NavItem key={item.id} item={item} />)}
        </nav>
        <div className="p-4 flex-shrink-0 border-t border-white/10">
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-full bg-brand-secondary flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-white/60">Online</p>
            </div>
            <button onClick={handleLogout} className="text-white/70 hover:text-white" title="Sair">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="lg:ml-72 flex flex-col min-h-screen">
        <div className="sticky top-0 z-30 bg-brand-background/80 backdrop-blur-sm border-b border-black/5">
          <div className="flex items-center justify-between h-20 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-brand-primary hover:text-brand-secondary"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1" />
            <span className="text-sm font-medium text-brand-text-muted">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        <main className="flex-1 p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
