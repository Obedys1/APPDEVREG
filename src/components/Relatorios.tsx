import React, { useState, useMemo } from 'react';
import { Download, FileText, MessageSquare, Image as ImageIcon, BarChart2, Package, Users, AlertTriangle, MapPin, Globe, Box, Building, UserCheck } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { FilterState, DevolutionRecord } from '../types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { generateDetalhadoPDF, generateProdutoMotivoEstadoPDF, generateClienteProdutoMotivoPDF, generateGeralDevolucoesPDF } from '../lib/pdfGenerators';

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

export const Relatorios: React.FC = () => {
  const { records: devolucoes, filterRecords } = useDevolutions();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

  const filteredDevolucoes = useMemo(() => filterRecords(filters), [devolucoes, filters, filterRecords]);
  const hasData = filteredDevolucoes.length > 0;

  const summaryStats = useMemo(() => {
    if (!hasData) return null;

    const getTopItem = (key: 'uf' | 'cidade' | 'vendedor' | 'rede' | 'motivo' | 'cliente' | 'produto' | 'familia' | 'grupo' | 'estado', countBy: 'occurrence' | 'quantity' = 'occurrence') => {
        const counts: Record<string, number> = {};
        
        filteredDevolucoes.forEach(record => {
            if (['uf', 'cidade', 'vendedor', 'rede', 'cliente'].includes(key)) {
                const itemKey = (record as any)[key];
                if (itemKey) counts[itemKey] = (counts[itemKey] || 0) + 1;
            } else if (['motivo', 'estado', 'familia', 'grupo', 'produto'].includes(key)) {
                record.produtos.forEach(p => {
                    const itemKey = (p as any)[key];
                    if (itemKey) {
                        counts[itemKey] = (counts[itemKey] || 0) + (countBy === 'quantity' ? p.quantidade : 1);
                    }
                });
            }
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? { name: sorted[0][0], value: sorted[0][1] } : null;
    };

    const totalQuantity = filteredDevolucoes.reduce((sum, record) => sum + record.produtos.reduce((prodSum, p) => prodSum + p.quantidade, 0), 0);

    return {
        totalRecords: filteredDevolucoes.length,
        totalQuantity: totalQuantity.toLocaleString('pt-BR'),
        topMotives: getTopItem('motivo'),
        topClients: getTopItem('cliente'),
        topProducts: getTopItem('produto', 'quantity'),
        topUF: getTopItem('uf'),
        topCidade: getTopItem('cidade'),
        topFamilia: getTopItem('familia'),
        topVendedor: getTopItem('vendedor'),
        topRede: getTopItem('rede'),
        topGrupo: getTopItem('grupo'),
        topEstado: getTopItem('estado'),
    };
  }, [filteredDevolucoes, hasData]);
  
  const clearFilters = () => setFilters({ 
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

  const handlePdfExport = async (generator: (records: DevolutionRecord[], stats: any) => Promise<void>, type: string) => {
    if (!hasData) {
      toast.error('Nenhum dado para exportar.');
      return;
    }
    setIsGenerating(type);
    const toastId = toast.loading(`Gerando PDF: ${type}...`);
    try {
      await generator(filteredDevolucoes, summaryStats);
      toast.success('PDF gerado com sucesso!', { id: toastId });
    } catch (error) {
      console.error(`Error generating ${type} PDF:`, error);
      toast.error(`Falha ao gerar PDF: ${(error as Error).message}`, { id: toastId });
    } finally {
      setIsGenerating(null);
    }
  };

  const exportToXLSX = () => {
    if (!hasData) { toast.error('Nenhum dado para exportar.'); return; }
    const toastId = toast.loading('Exportando para XLSX...');

    const devolucoesFlat = filteredDevolucoes.flatMap(record => 
      record.produtos.map(p => ({
        'ID Registro': record.id,
        'Data Registro': format(parseISO(record.created_at), 'dd/MM/yyyy HH:mm:ss'),
        'Data Ocorrência': format(parseISO(record.date), 'dd/MM/yyyy'),
        'Status': record.status,
        'Cliente': record.cliente,
        'Vendedor': record.vendedor,
        'Rede': record.rede,
        'Cidade': record.cidade,
        'UF': record.uf,
        'Motorista': record.motorista,
        'Observação Geral': record.observacao,
        'Registrado Por': record.usuario,
        'ID Produto': p.id,
        'Código Produto': p.codigo,
        'Produto': p.produto,
        'Família': p.familia,
        'Grupo': p.grupo,
        'Quantidade': p.quantidade,
        'Tipo Unidade': p.tipo,
        'Motivo Devolução': p.motivo,
        'Estado Produto': p.estado,
        'Reincidência': p.reincidencia,
        'Anexos': record.anexos.join(', '),
      }))
    );

    const ws = XLSX.utils.json_to_sheet(devolucoesFlat);

    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "013D28" } } };
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = headerStyle;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio Devolucoes');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(dataBlob, `relatorio_devolucoes_gdm_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('XLSX exportado com sucesso!', { id: toastId });
  };
  
  const handleWhatsAppSummary = () => {
    if (!summaryStats) {
        toast.error('Não há dados de resumo para compartilhar.');
        return;
    }
    const { totalRecords, totalQuantity, topMotives, topClients, topProducts, topUF, topVendedor, topRede } = summaryStats;
    let message = `📊 *Resumo Geral de Devoluções* 📊\n\n`;
    message += `*Total de Registros:* ${totalRecords}\n`;
    message += `*Qtd. Total de Itens:* ${totalQuantity}\n\n`;
    message += `*🏆 Top Motivo:* ${topMotives?.name || '-'} (${topMotives?.value || 0} ocorr.)\n`;
    message += `*🏆 Top Cliente:* ${topClients?.name || '-'} (${topClients?.value || 0} dev.)\n`;
    message += `*🏆 Top Produto (Qtd):* ${topProducts?.name || '-'} (${topProducts?.value.toLocaleString('pt-BR') || 0} qtd.)\n`;
    message += `*🏆 Top Vendedor:* ${topVendedor?.name || '-'} (${topVendedor?.value || 0} dev.)\n`;
    message += `*🏆 Top Rede:* ${topRede?.name || '-'} (${topRede?.value || 0} dev.)\n`;
    message += `*🏆 Top UF:* ${topUF?.name || '-'} (${topUF?.value || 0} dev.)\n`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Relatórios de devoluções</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} moduleType="devolucao" />
      
      {summaryStats && (
        <div className="bg-brand-surface rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-brand-primary mb-4">
            Resumo dos dados ({summaryStats.totalRecords} registros encontrados)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <StatCard icon={<BarChart2 className="h-5 w-5 text-brand-primary" />} title="Total de devoluções" value={summaryStats.totalRecords} />
            <StatCard icon={<Package className="h-5 w-5 text-brand-secondary" />} title="Qtd. total de itens" value={summaryStats.totalQuantity} />
            <StatCard icon={<AlertTriangle className="h-5 w-5 text-brand-accent" />} title="Top motivo" value={summaryStats.topMotives?.name || '-'} subtitle={`${summaryStats.topMotives?.value || 0} ocorr.`} />
            <StatCard icon={<Users className="h-5 w-5 text-brand-primary" />} title="Top cliente" value={summaryStats.topClients?.name || '-'} subtitle={`${summaryStats.topClients?.value || 0} dev.`} />
            <StatCard icon={<Package className="h-5 w-5 text-brand-secondary" />} title="Top produto (Qtd)" value={summaryStats.topProducts?.name || '-'} subtitle={`${summaryStats.topProducts?.value.toLocaleString('pt-BR') || 0} qtd.`} />
            <StatCard icon={<Globe className="h-5 w-5 text-brand-primary" />} title="Top UF" value={summaryStats.topUF?.name || '-'} subtitle={`${summaryStats.topUF?.value || 0} dev.`} />
            <StatCard icon={<MapPin className="h-5 w-5 text-brand-secondary" />} title="Top cidade" value={summaryStats.topCidade?.name || '-'} subtitle={`${summaryStats.topCidade?.value || 0} dev.`} />
            <StatCard icon={<Box className="h-5 w-5 text-brand-primary" />} title="Top família" value={summaryStats.topFamilia?.name || '-'} subtitle={`${summaryStats.topFamilia?.value || 0} ocorr.`} />
            <StatCard icon={<UserCheck className="h-5 w-5 text-brand-secondary" />} title="Top vendedor" value={summaryStats.topVendedor?.name || '-'} subtitle={`${summaryStats.topVendedor?.value || 0} dev.`} />
            <StatCard icon={<Building className="h-5 w-5 text-brand-primary" />} title="Top rede" value={summaryStats.topRede?.name || '-'} subtitle={`${summaryStats.topRede?.value || 0} dev.`} />
            <StatCard icon={<Box className="h-5 w-5 text-brand-secondary" />} title="Top grupo" value={summaryStats.topGrupo?.name || '-'} subtitle={`${summaryStats.topGrupo?.value || 0} ocorr.`} />
            <StatCard icon={<AlertTriangle className="h-5 w-5 text-brand-accent" />} title="Top estado" value={summaryStats.topEstado?.name || '-'} subtitle={`${summaryStats.topEstado?.value || 0} ocorr.`} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard title="Exportar PDF" icon={<FileText className="h-6 w-6 text-brand-accent" />}>
          <ActionButton onClick={() => handlePdfExport(generateGeralDevolucoesPDF, 'Geral')} disabled={!hasData || !!isGenerating} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">
            {isGenerating === 'Geral' ? 'Gerando...' : 'Relatório Geral'}
          </ActionButton>
          <ActionButton onClick={() => handlePdfExport(generateClienteProdutoMotivoPDF, 'Cliente x Produto')} disabled={!hasData || !!isGenerating} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">
            {isGenerating === 'Cliente x Produto' ? 'Gerando...' : 'Cliente x Produto'}
          </ActionButton>
           <ActionButton onClick={() => handlePdfExport(generateProdutoMotivoEstadoPDF, 'Produto x Motivo')} disabled={!hasData || !!isGenerating} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">
            {isGenerating === 'Produto x Motivo' ? 'Gerando...' : 'Produto x Motivo x Estado'}
          </ActionButton>
          <ActionButton onClick={() => handlePdfExport(generateDetalhadoPDF, 'Detalhado')} disabled={!hasData || !!isGenerating} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">
            <ImageIcon className="h-4 w-4" /> {isGenerating === 'Detalhado' ? 'Gerando...' : 'Relatório Detalhado'}
          </ActionButton>
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
