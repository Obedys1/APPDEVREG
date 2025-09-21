import React, { useState, useMemo } from 'react';
import { Download, FileText, MessageSquare } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { FilterState, DevolutionRecord } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Augment jsPDF interface for jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
  <button onClick={onClick} disabled={disabled} className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${className} disabled:opacity-50 disabled:cursor-not-allowed`}>
    {children}
  </button>
);

export const Relatorios: React.FC = () => {
  const { records, filterRecords } = useDevolutions();
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

  const filteredRecords = useMemo(() => filterRecords(filters), [records, filters, filterRecords]);
  const hasData = filteredRecords.length > 0;

  const clearFilters = () => setFilters({ 
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

  const generatePDFGeneral = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o relatório.'); return; }
    const toastId = toast.loading('Gerando PDF Geral...');
    
    const doc = new jsPDF();
    doc.text('Relatório Geral de Devoluções', 14, 15);

    const tableRows = filteredRecords.flatMap(rec => 
      rec.produtos.map(p => [
        new Date(rec.date).toLocaleDateString('pt-BR'),
        rec.cliente,
        rec.motorista,
        p.produto,
        `${p.quantidade} ${p.tipo}`,
        p.motivo,
        rec.status,
      ])
    );

    doc.autoTable({
      head: [['Data', 'Cliente', 'Motorista', 'Produto', 'Qtd', 'Motivo', 'Status']],
      body: tableRows,
      startY: 20,
    });

    doc.save('relatorio_geral.pdf');
    toast.success('PDF Geral gerado!', { id: toastId });
  };

  const generatePDFClienteProdutoMotivo = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o relatório.'); return; }
    const toastId = toast.loading('Gerando PDF...');

    const doc = new jsPDF();
    doc.text('Relatório: Cliente x Produto x Motivo', 14, 15);

    const groupedData: Record<string, Record<string, Record<string, number>>> = {};
    filteredRecords.forEach(rec => {
      rec.produtos.forEach(p => {
        groupedData[rec.cliente] = groupedData[rec.cliente] || {};
        groupedData[rec.cliente][p.produto] = groupedData[rec.cliente][p.produto] || {};
        groupedData[rec.cliente][p.produto][p.motivo] = (groupedData[rec.cliente][p.produto][p.motivo] || 0) + p.quantidade;
      });
    });

    const tableRows = Object.entries(groupedData).flatMap(([cliente, produtos]) =>
      Object.entries(produtos).flatMap(([produto, motivos]) =>
        Object.entries(motivos).map(([motivo, qtd]) => [cliente, produto, motivo, qtd.toFixed(2)])
      )
    );

    doc.autoTable({
      head: [['Cliente', 'Produto', 'Motivo', 'Qtd Total']],
      body: tableRows,
      startY: 20,
    });

    doc.save('relatorio_cliente_produto_motivo.pdf');
    toast.success('PDF gerado!', { id: toastId });
  };

  const generatePDFProdutoMotivoEstado = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o relatório.'); return; }
    const toastId = toast.loading('Gerando PDF...');

    const doc = new jsPDF();
    doc.text('Relatório: Produto x Motivo x Estado', 14, 15);

    const groupedData: Record<string, Record<string, Record<string, number>>> = {};
    filteredRecords.forEach(rec => {
      rec.produtos.forEach(p => {
        groupedData[p.produto] = groupedData[p.produto] || {};
        groupedData[p.produto][p.motivo] = groupedData[p.produto][p.motivo] || {};
        const estado = p.estado || 'N/A';
        groupedData[p.produto][p.motivo][estado] = (groupedData[p.produto][p.motivo][estado] || 0) + p.quantidade;
      });
    });

    const tableRows = Object.entries(groupedData).flatMap(([produto, motivos]) =>
      Object.entries(motivos).flatMap(([motivo, estados]) =>
        Object.entries(estados).map(([estado, qtd]) => [produto, motivo, estado, qtd.toFixed(2)])
      )
    );

    doc.autoTable({
      head: [['Produto', 'Motivo', 'Estado', 'Qtd Total']],
      body: tableRows,
      startY: 20,
    });

    doc.save('relatorio_produto_motivo_estado.pdf');
    toast.success('PDF gerado!', { id: toastId });
  };

  const exportToExcel = () => {
    if (!hasData) { toast.error('Nenhum dado para exportar.'); return; }
    const toastId = toast.loading('Exportando para CSV...');

    const headers = ["ID Registro", "Data", "Cliente", "Vendedor", "Rede", "Cidade", "UF", "Motorista", "Status", "Observação Geral", "Código Produto", "Produto", "Família", "Grupo", "Quantidade", "Tipo", "Motivo", "Estado", "Reincidência"];
    
    const rows = filteredRecords.flatMap(record => 
      record.produtos.map(p => [
        record.id,
        new Date(record.date).toLocaleDateString('pt-BR'),
        `"${record.cliente.replace(/"/g, '""')}"`,
        `"${record.vendedor.replace(/"/g, '""')}"`,
        `"${record.rede.replace(/"/g, '""')}"`,
        `"${record.cidade.replace(/"/g, '""')}"`,
        record.uf,
        `"${record.motorista.replace(/"/g, '""')}"`,
        record.status,
        `"${(record.observacao || '').replace(/"/g, '""')}"`,
        p.codigo,
        `"${p.produto.replace(/"/g, '""')}"`,
        `"${p.familia.replace(/"/g, '""')}"`,
        `"${p.grupo.replace(/"/g, '""')}"`,
        p.quantidade,
        p.tipo,
        `"${p.motivo.replace(/"/g, '""')}"`,
        `"${(p.estado || '').replace(/"/g, '""')}"`,
        p.reincidencia
      ].join(','))
    );

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_devolucoes.csv");
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
    toast.success('CSV exportado com sucesso!', { id: toastId });
  };

  const openWhatsApp = (message: string) => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Resumo pronto para envio no WhatsApp!');
  }

  const generateWhatsAppGeneral = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o resumo.'); return; }
    let message = '📊 *Resumo Geral de Devoluções*\n\n';
    message += `*Total de Registros:* ${filteredRecords.length}\n`;
    const totalQty = filteredRecords.reduce((sum, rec) => sum + rec.produtos.reduce((pSum, p) => pSum + p.quantidade, 0), 0);
    message += `*Total de Itens Devolvidos:* ${totalQty.toLocaleString('pt-BR')}\n\n`;
    message += '*(Com base nos filtros aplicados)*';
    openWhatsApp(message);
  };
  
  const generateWhatsAppClienteProdutoMotivo = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o resumo.'); return; }
    let message = '👤 *Resumo: Cliente x Produto x Motivo*\n\n';
    const limitedRecords = filteredRecords.slice(0, 5); // Limit to avoid huge messages
    limitedRecords.forEach(rec => {
      message += `*Cliente:* ${rec.cliente}\n`;
      rec.produtos.forEach(p => {
        message += `  - *Produto:* ${p.produto}\n`;
        message += `    - *Motivo:* ${p.motivo} | *Qtd:* ${p.quantidade}\n`;
      });
      message += '\n';
    });
    if(filteredRecords.length > 5) message += `\n... e mais ${filteredRecords.length - 5} registros.\n`;
    message += '\n*(Com base nos filtros aplicados)*';
    openWhatsApp(message);
  };
  
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Relatórios e Exportação</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard title="Exportar PDF" icon={<FileText className="h-6 w-6 text-brand-accent" />}>
          <ActionButton onClick={generatePDFGeneral} disabled={!hasData} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">Relatório Geral</ActionButton>
          <ActionButton onClick={generatePDFClienteProdutoMotivo} disabled={!hasData} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">Cliente x Produto x Motivo</ActionButton>
          <ActionButton onClick={generatePDFProdutoMotivoEstado} disabled={!hasData} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">Produto x Motivo x Estado</ActionButton>
        </ActionCard>

        <ActionCard title="Exportar Dados" icon={<Download className="h-6 w-6 text-brand-primary" />}>
          <ActionButton onClick={exportToExcel} disabled={!hasData} className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Exportar para Excel (CSV)</ActionButton>
        </ActionCard>

        <ActionCard title="Enviar via WhatsApp" icon={<MessageSquare className="h-6 w-6 text-green-600" />}>
          <ActionButton onClick={generateWhatsAppGeneral} disabled={!hasData} className="bg-green-600/10 text-green-700 hover:bg-green-600/20">Resumo Geral</ActionButton>
          <ActionButton onClick={generateWhatsAppClienteProdutoMotivo} disabled={!hasData} className="bg-green-600/10 text-green-700 hover:bg-green-600/20">Resumo Cliente x Produto</ActionButton>
        </ActionCard>
      </div>

      <div className="bg-brand-surface rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-brand-primary mb-4">
          Resumo dos Dados ({filteredRecords.length} registros encontrados)
        </h3>
        <p className="text-sm text-brand-text-muted">
          Utilize os filtros acima para refinar sua busca e depois use os botões de ação para gerar relatórios, exportar dados ou compartilhar resumos.
        </p>
      </div>
    </div>
  );
};
