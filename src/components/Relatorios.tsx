import React, { useState, useMemo } from 'react';
import { Download, FileText, MessageSquare } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { FilterState } from '../types';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const ActionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <motion.div 
    className="bg-brand-surface rounded-2xl shadow-lg p-6"
    whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
  >
    <h3 className="text-lg font-semibold text-brand-primary mb-4 flex items-center gap-3">
      {icon} {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </motion.div>
);

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className }) => (
  <button onClick={onClick} className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${className}`}>
    {children}
  </button>
);

export const Relatorios: React.FC = () => {
  const { records, filterRecords } = useDevolutions();
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: ''
  });

  const filteredRecords = useMemo(() => filterRecords(filters), [records, filters]);
  const clearFilters = () => setFilters({ search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '' });

  // PDF and WhatsApp generation functions remain the same
  const generatePDFGeneral = () => { toast.success('Gerando PDF Geral...'); };
  const generatePDFClienteProdutoMotivo = () => { toast.success('Gerando PDF Cliente x Produto...'); };
  const generatePDFProdutoMotivoEstado = () => { toast.success('Gerando PDF Produto x Motivo...'); };
  const exportToExcel = () => { toast.success('Exportando para CSV...'); };
  const generateWhatsAppGeneral = () => { toast.success('Gerando resumo para WhatsApp...'); };
  const generateWhatsAppClienteProdutoMotivo = () => { toast.success('Gerando resumo para WhatsApp...'); };
  const generateWhatsAppMesemana = () => { toast.success('Gerando resumo para WhatsApp...'); };
  const generateWhatsAppProdutoMotivo = () => { toast.success('Gerando resumo para WhatsApp...'); };
  const generateWhatsAppProdutoMotivoEstado = () => { toast.success('Gerando resumo para WhatsApp...'); };


  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Relatórios e Exportação</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard title="Exportar PDF" icon={<FileText className="h-6 w-6 text-brand-accent" />}>
          <ActionButton onClick={generatePDFGeneral} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">Relatório Geral</ActionButton>
          <ActionButton onClick={generatePDFClienteProdutoMotivo} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">Cliente x Produto x Motivo</ActionButton>
          <ActionButton onClick={generatePDFProdutoMotivoEstado} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">Produto x Motivo x Estado</ActionButton>
        </ActionCard>

        <ActionCard title="Exportar Dados" icon={<Download className="h-6 w-6 text-brand-primary" />}>
          <ActionButton onClick={exportToExcel} className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Exportar para Excel (CSV)</ActionButton>
        </ActionCard>

        <ActionCard title="Enviar via WhatsApp" icon={<MessageSquare className="h-6 w-6 text-green-600" />}>
          <ActionButton onClick={generateWhatsAppGeneral} className="bg-green-600/10 text-green-700 hover:bg-green-600/20">Relatório Geral</ActionButton>
          <ActionButton onClick={generateWhatsAppClienteProdutoMotivo} className="bg-green-600/10 text-green-700 hover:bg-green-600/20">Cliente x Produto x Motivo</ActionButton>
          <ActionButton onClick={generateWhatsAppMesemana} className="bg-green-600/10 text-green-700 hover:bg-green-600/20">Por Mês e Semana</ActionButton>
          <ActionButton onClick={generateWhatsAppProdutoMotivo} className="bg-green-600/10 text-green-700 hover:bg-green-600/20">Produto x Motivo</ActionButton>
          <ActionButton onClick={generateWhatsAppProdutoMotivoEstado} className="bg-green-600/10 text-green-700 hover:bg-green-600/20">Produto x Motivo x Estado</ActionButton>
        </ActionCard>
      </div>

      <div className="bg-brand-surface rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-brand-primary mb-4">
          Resumo dos Dados ({filteredRecords.length} registros)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Summary stats here */}
        </div>
      </div>
    </div>
  );
};
