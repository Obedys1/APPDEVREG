import React, { useState, useMemo } from 'react';
import { Download, FileText, MessageSquare, BarChart2, Users, AlertTriangle, MapPin, Globe, Building, UserCheck, Briefcase } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useOccurrences } from '../hooks/useOccurrences';
import { FilterState, OccurrenceRecord } from '../types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { generateGeralOcorrenciasPDF, generateClienteMotivoOcorrenciaPDF, generateSetorImpactoPDF, generateResumosOcorrenciasPDF } from '../lib/pdfGenerators';

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

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
  <button onClick={onClick} disabled={disabled} className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${className} disabled:opacity-50 disabled:cursor-not-allowed`}>
    {children}
  </button>
);

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; subtitle?: string; }> = ({ icon, title, value, subtitle }) => (
  <div className="bg-brand-surface rounded-xl shadow-lg p-4 flex items-start gap-3">
    <div className="bg-brand-primary/10 p-2.5 rounded-md">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-brand-text-muted capitalize">{title}</p>
      <p className="text-lg font-bold text-brand-primary break-words" title={String(value)}>{value}</p>
      {subtitle && <p className="text-xs text-brand-text-muted">{subtitle}</p>}
    </div>
  </div>
);

export const RelatoriosOcorrencias: React.FC = () => {
  const { occurrences, filterOccurrences } = useOccurrences();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: '', cliente: '', reincidencia: '',
    vendedor: '', rede: '', cidade: '', uf: '', setor_responsavel: '', motivo_ocorrencia: '', impactos: ''
  });

  const filteredOccurrences = useMemo(() => filterOccurrences(filters), [occurrences, filters, filterOccurrences]);
  const hasData = filteredOccurrences.length > 0;

  const summaryStats = useMemo(() => {
    if (!hasData) return null;

    const getTopItem = (key: keyof OccurrenceRecord) => {
        const counts: Record<string, number> = {};
        filteredOccurrences.forEach(record => {
            const itemKey = record[key];
            if (itemKey) counts[itemKey] = (counts[itemKey] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? { name: sorted[0][0], value: sorted[0][1] } : null;
    };

    return {
        totalRecords: filteredOccurrences.length,
        topMotivoOcorrencia: getTopItem('motivo_ocorrencia'),
        topSetorResponsavel: getTopItem('setor_responsavel'),
        topImpacto: getTopItem('impactos'),
        topClients: getTopItem('cliente'),
        topUF: getTopItem('uf'),
        topCidade: getTopItem('cidade'),
        topVendedor: getTopItem('vendedor'),
        topRede: getTopItem('rede'),
    };
  }, [filteredOccurrences, hasData]);
  
  const clearFilters = () => setFilters({ 
    search: '', startDate: '', endDate: '', period: '', cliente: '', reincidencia: '',
    vendedor: '', rede: '', cidade: '', uf: '', setor_responsavel: '', motivo_ocorrencia: '', impactos: ''
  });

  const handlePdfExport = async (generator: (records: OccurrenceRecord[], stats: any) => Promise<void>, type: string) => {
    if (!hasData) { toast.error('Nenhuma ocorrência para exportar.'); return; }
    setIsGenerating(type);
    const toastId = toast.loading(`Gerando PDF: ${type}...`);
    try {
      await generator(filteredOccurrences, summaryStats);
      toast.success('PDF gerado com sucesso!', { id: toastId });
    } catch (error) {
      console.error(`Error generating ${type} PDF:`, error);
      toast.error(`Falha ao gerar PDF: ${(error as Error).message}`, { id: toastId });
    } finally {
      setIsGenerating(null);
    }
  };

  const exportToXLSX = () => {
    if (!hasData) { toast.error('Nenhuma ocorrência para exportar.'); return; }
    const toastId = toast.loading('Exportando para XLSX...');

    const dataToExport = filteredOccurrences.map(record => ({
      'ID Registro': record.id,
      'Data Registro': format(parseISO(record.created_at), 'dd/MM/yyyy HH:mm:ss'),
      'Data Ocorrência': format(parseISO(record.data), 'dd/MM/yyyy'),
      'Cliente': record.cliente,
      'Vendedor': record.vendedor,
      'Rede': record.rede,
      'Cidade': record.cidade,
      'UF': record.uf,
      'Motorista': record.motorista,
      'Reincidência': record.reincidencia,
      'Setor Responsável': record.setor_responsavel,
      'Motivo Ocorrência': record.motivo_ocorrencia,
      'Resumo Ocorrência': record.resumo_ocorrencia,
      'Tratativa': record.tratativa,
      'Impactos': record.impactos,
      'Registrado Por': record.usuario,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "013D28" } } };
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = headerStyle;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio Ocorrencias');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(dataBlob, `relatorio_ocorrencias_gdm_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('XLSX exportado com sucesso!', { id: toastId });
  };
  
  const handleWhatsAppSummary = () => {
    if (!summaryStats) {
        toast.error('Não há dados de resumo para compartilhar.');
        return;
    }
    const { totalRecords, topMotivoOcorrencia, topSetorResponsavel, topImpacto, topClients } = summaryStats;
    let message = `📋 *Resumo Geral de Ocorrências* 📋\n\n`;
    message += `*Total de Ocorrências:* ${totalRecords}\n\n`;
    message += `*🏆 Top Motivo:* ${topMotivoOcorrencia?.name || '-'} (${topMotivoOcorrencia?.value || 0} ocorr.)\n`;
    message += `*🏆 Top Setor:* ${topSetorResponsavel?.name || '-'} (${topSetorResponsavel?.value || 0} ocorr.)\n`;
    message += `*🏆 Top Impacto:* ${topImpacto?.name || '-'} (${topImpacto?.value || 0} ocorr.)\n`;
    message += `*🏆 Top Cliente:* ${topClients?.name || '-'} (${topClients?.value || 0} ocorr.)\n`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Relatórios de ocorrências</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} moduleType="ocorrencia" />
      
      {summaryStats && (
        <div className="bg-brand-surface rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-brand-primary mb-4">
            Resumo dos dados ({summaryStats.totalRecords} ocorrências encontradas)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <StatCard icon={<BarChart2 className="h-5 w-5 text-brand-primary" />} title="Total de ocorrências" value={summaryStats.totalRecords} />
            <StatCard icon={<AlertTriangle className="h-5 w-5 text-brand-accent" />} title="Top motivo" value={summaryStats.topMotivoOcorrencia?.name || '-'} subtitle={`${summaryStats.topMotivoOcorrencia?.value || 0} ocorr.`} />
            <StatCard icon={<Briefcase className="h-5 w-5 text-brand-primary" />} title="Top setor" value={summaryStats.topSetorResponsavel?.name || '-'} subtitle={`${summaryStats.topSetorResponsavel?.value || 0} ocorr.`} />
            <StatCard icon={<AlertTriangle className="h-5 w-5 text-brand-secondary" />} title="Top impacto" value={summaryStats.topImpacto?.name || '-'} subtitle={`${summaryStats.topImpacto?.value || 0} ocorr.`} />
            <StatCard icon={<Users className="h-5 w-5 text-brand-primary" />} title="Top cliente" value={summaryStats.topClients?.name || '-'} subtitle={`${summaryStats.topClients?.value || 0} ocorr.`} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard title="Exportar PDF" icon={<FileText className="h-6 w-6 text-brand-accent" />}>
          <ActionButton onClick={() => handlePdfExport(generateGeralOcorrenciasPDF, 'Geral')} disabled={!hasData || !!isGenerating} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">{isGenerating === 'Geral' ? 'Gerando...' : 'Relatório Geral'}</ActionButton>
          <ActionButton onClick={() => handlePdfExport(generateClienteMotivoOcorrenciaPDF, 'Cliente x Motivo')} disabled={!hasData || !!isGenerating} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">{isGenerating === 'Cliente x Motivo' ? 'Gerando...' : 'Cliente x Motivo'}</ActionButton>
          <ActionButton onClick={() => handlePdfExport(generateSetorImpactoPDF, 'Setor x Impacto')} disabled={!hasData || !!isGenerating} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">{isGenerating === 'Setor x Impacto' ? 'Gerando...' : 'Setor x Impacto'}</ActionButton>
          <ActionButton onClick={() => handlePdfExport(generateResumosOcorrenciasPDF, 'Resumos')} disabled={!hasData || !!isGenerating} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">{isGenerating === 'Resumos' ? 'Gerando...' : 'Resumos Agrupados'}</ActionButton>
        </ActionCard>

        <ActionCard title="Exportar Dados" icon={<Download className="h-6 w-6 text-brand-primary" />}>
          <ActionButton onClick={exportToXLSX} disabled={!hasData} className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Exportar para Excel (XLSX)</ActionButton>
        </ActionCard>

        <ActionCard title="Enviar via WhatsApp" icon={<MessageSquare className="h-6 w-6 text-green-600" />}>
          <ActionButton onClick={handleWhatsAppSummary} disabled={!hasData} className="bg-green-600/10 text-green-700 hover:bg-green-600/20">
            Resumo Geral
          </ActionButton>
        </ActionCard>
      </div>
    </div>
  );
};
