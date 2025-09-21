import React, { useState, useMemo } from 'react';
import { Download, FileText, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { FilterState, DevolutionRecord } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  // --- PDF Helper Functions ---
  const addHeader = (doc: jsPDF, title: string) => {
    const logoUrl = 'https://i.ibb.co/67X3xfSV/gdm-devolucoes-logo.png';
    doc.addImage(logoUrl, 'PNG', 14, 12, 25, 25);
    
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#013D28');
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, doc.internal.pageSize.getWidth() - 14, 20, { align: 'right' });
    
    doc.setDrawColor('#F9A03F');
    doc.setLineWidth(1);
    doc.line(14, 40, doc.internal.pageSize.getWidth() - 14, 40);
  };

  const addFooter = (doc: jsPDF) => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor('#666');
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
  };

  const drawStatCard = (doc: jsPDF, x: number, y: number, width: number, height: number, title: string, value: string) => {
    doc.setFillColor('#FBF5EB');
    doc.roundedRect(x, y, width, height, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor('#666');
    doc.text(title, x + 5, y + 7);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#013D28');
    doc.text(value, x + 5, y + 16);
    doc.setFont('helvetica', 'normal');
  };

  const getImageAsBase64 = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg');
        resolve(dataURL);
      };
      img.onerror = () => {
        console.error(`Falha ao carregar imagem: ${url}`);
        resolve(null);
      };
      img.src = url;
    });
  };

  // --- PDF Generation Logic ---
  const generatePDFGeneral = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o relatório.'); return; }
    const toastId = toast.loading('Gerando Relatório Geral...');

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        let lastY = 50;
        
        addHeader(doc, 'Relatório Geral');

        const totalRegistros = filteredRecords.length;
        const totalQuantidade = filteredRecords.reduce((sum, rec) => sum + rec.produtos.reduce((pSum, p) => pSum + p.quantidade, 0), 0);
        
        const byClient: Record<string, { count: number; quantity: number }> = {};
        const byProduct: Record<string, number> = {};
        const byMotive: Record<string, number> = {};
        const byMonth: Record<string, number> = {};

        filteredRecords.forEach(record => {
            const clientKey = record.cliente;
            byClient[clientKey] = byClient[clientKey] || { count: 0, quantity: 0 };
            byClient[clientKey].count++;

            const monthYear = format(parseISO(record.date), 'MM/yyyy', { locale: ptBR });
            byMonth[monthYear] = (byMonth[monthYear] || 0) + 1;

            record.produtos.forEach(p => {
                byClient[clientKey].quantity += p.quantidade;
                byProduct[p.produto] = (byProduct[p.produto] || 0) + p.quantidade;
                byMotive[p.motivo] = (byMotive[p.motivo] || 0) + 1;
            });
        });

        const toSortedArray = (data: Record<string, any>, key: 'count' | 'quantity' | null = null) => {
            return Object.entries(data).sort((a, b) => {
                const valA = key ? a[1][key] : a[1];
                const valB = key ? b[1][key] : b[1];
                return valB - valA;
            });
        };

        drawStatCard(doc, 14, lastY, 88, 20, 'Total de Registros', String(totalRegistros));
        drawStatCard(doc, 108, lastY, 88, 20, 'Total de Itens (Qtd)', totalQuantidade.toLocaleString('pt-BR'));
        lastY += 30;

        const addSection = (title: string, head: any[], body: any[][]) => {
            if (lastY > 240) { doc.addPage(); lastY = 20; }
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#013D28');
            doc.text(title, 14, lastY);
            lastY += 8;

            autoTable(doc, {
                head: head,
                body: body,
                startY: lastY,
                theme: 'striped',
                headStyles: { fillColor: '#013D28', textColor: '#fff' },
                didDrawPage: (data) => { lastY = data.cursor?.y || 20; }
            });
            lastY = (doc as any).lastAutoTable.finalY + 15;
        }

        const clientBody = toSortedArray(byClient, 'count').map(([name, data]) => [name, data.count, `${((data.count / totalRegistros) * 100).toFixed(2)}%`]);
        addSection('Devoluções por Cliente', [['Cliente', 'Registros', '% do Total']], clientBody);

        const productBody = toSortedArray(byProduct).map(([name, qty]) => [name, qty.toLocaleString('pt-BR'), `${((qty / totalQuantidade) * 100).toFixed(2)}%`]);
        addSection('Devoluções por Produto', [['Produto', 'Qtd. Devolvida', '% do Total']], productBody);
        
        const totalMotives = Object.values(byMotive).reduce((a, b) => a + b, 0);
        const motiveBody = toSortedArray(byMotive).map(([name, count]) => [name, count, `${((count / totalMotives) * 100).toFixed(2)}%`]);
        addSection('Devoluções por Motivo', [['Motivo', 'Ocorrências', '% do Total']], motiveBody);

        const monthBody = toSortedArray(byMonth).map(([name, count]) => [name, count]);
        addSection('Devoluções por Mês', [['Mês/Ano', 'Registros']], monthBody);

        addFooter(doc);
        doc.save('relatorio_geral_gdm.pdf');
        toast.success('Relatório gerado com sucesso!', { id: toastId });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        toast.error('Ocorreu um erro ao gerar o PDF.', { id: toastId });
    }
  };

  const generatePDFClienteProdutoMotivo = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o relatório.'); return; }
    const toastId = toast.loading('Gerando Relatório...');

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        let lastY = 50;

        addHeader(doc, 'Relatório: Cliente x Produto');

        const groupedData: Record<string, { totalQuantity: number; products: Record<string, { totalQuantity: number; motives: Record<string, number> }> }> = {};
        
        filteredRecords.forEach(rec => {
            if (!groupedData[rec.cliente]) {
                groupedData[rec.cliente] = { totalQuantity: 0, products: {} };
            }
            rec.produtos.forEach(p => {
                groupedData[rec.cliente].totalQuantity += p.quantidade;
                if (!groupedData[rec.cliente].products[p.produto]) {
                    groupedData[rec.cliente].products[p.produto] = { totalQuantity: 0, motives: {} };
                }
                groupedData[rec.cliente].products[p.produto].totalQuantity += p.quantidade;
                groupedData[rec.cliente].products[p.produto].motives[p.motivo] = (groupedData[rec.cliente].products[p.produto].motives[p.motivo] || 0) + p.quantidade;
            });
        });

        drawStatCard(doc, 14, lastY, 88, 20, 'Total de Clientes', String(Object.keys(groupedData).length));
        lastY += 30;

        for (const [cliente, data] of Object.entries(groupedData)) {
            if (lastY > 220) { doc.addPage(); lastY = 20; }
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#013D28');
            doc.text(`Cliente: ${cliente}`, 14, lastY);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#333');
            doc.text(`Total Devolvido: ${data.totalQuantity.toLocaleString('pt-BR')}`, 14, lastY + 5);
            lastY += 12;

            const tableBody = Object.entries(data.products).flatMap(([produto, prodData]) => 
                Object.entries(prodData.motives).map(([motivo, qtd], index) => 
                    index === 0 ? [produto, motivo, qtd.toLocaleString('pt-BR')] : ['', motivo, qtd.toLocaleString('pt-BR')]
                )
            );

            autoTable(doc, {
                head: [['Produto', 'Motivo', 'Quantidade']],
                body: tableBody,
                startY: lastY,
                theme: 'grid',
                headStyles: { fillColor: '#F5F5F5', textColor: '#333' },
                didDrawPage: (data) => { lastY = data.cursor?.y || 20; }
            });
            lastY = (doc as any).lastAutoTable.finalY + 15;
        }

        addFooter(doc);
        doc.save('relatorio_cliente_produto_motivo.pdf');
        toast.success('Relatório gerado!', { id: toastId });
    } catch (error) {
        console.error("PDF Generation Error:", error);
        toast.error('Ocorreu um erro ao gerar o PDF.', { id: toastId });
    }
  };

  const generatePDFProdutoMotivoEstado = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o relatório.'); return; }
    const toastId = toast.loading('Gerando Relatório...');

     try {
        const doc = new jsPDF('p', 'mm', 'a4');
        let lastY = 50;

        addHeader(doc, 'Relatório: Produto x Motivo x Estado');

        const groupedData: Record<string, { totalQuantity: number; motives: Record<string, { totalQuantity: number; states: Record<string, number> }> }> = {};
        
        filteredRecords.forEach(rec => {
            rec.produtos.forEach(p => {
                if (!groupedData[p.produto]) {
                    groupedData[p.produto] = { totalQuantity: 0, motives: {} };
                }
                groupedData[p.produto].totalQuantity += p.quantidade;

                if (!groupedData[p.produto].motives[p.motivo]) {
                    groupedData[p.produto].motives[p.motivo] = { totalQuantity: 0, states: {} };
                }
                groupedData[p.produto].motives[p.motivo].totalQuantity += p.quantidade;
                
                const estado = p.estado || 'N/A';
                groupedData[p.produto].motives[p.motivo].states[estado] = (groupedData[p.produto].motives[p.motivo].states[estado] || 0) + p.quantidade;
            });
        });

        drawStatCard(doc, 14, lastY, 88, 20, 'Total de Produtos Únicos', String(Object.keys(groupedData).length));
        lastY += 30;

        for (const [produto, data] of Object.entries(groupedData)) {
            if (lastY > 220) { doc.addPage(); lastY = 20; }
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#013D28');
            doc.text(`Produto: ${produto}`, 14, lastY);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#333');
            doc.text(`Total Devolvido: ${data.totalQuantity.toLocaleString('pt-BR')}`, 14, lastY + 5);
            lastY += 12;

            const tableBody = Object.entries(data.motives).flatMap(([motivo, motivoData]) => 
                Object.entries(motivoData.states).map(([estado, qtd], index) => 
                    index === 0 ? [motivo, estado, qtd.toLocaleString('pt-BR')] : ['', estado, qtd.toLocaleString('pt-BR')]
                )
            );

            autoTable(doc, {
                head: [['Motivo', 'Estado', 'Quantidade']],
                body: tableBody,
                startY: lastY,
                theme: 'grid',
                headStyles: { fillColor: '#F5F5F5', textColor: '#333' },
                didDrawPage: (data) => { lastY = data.cursor?.y || 20; }
            });
            lastY = (doc as any).lastAutoTable.finalY + 15;
        }

        addFooter(doc);
        doc.save('relatorio_produto_motivo_estado.pdf');
        toast.success('Relatório gerado!', { id: toastId });
    } catch (error) {
        console.error("PDF Generation Error:", error);
        toast.error('Ocorreu um erro ao gerar o PDF.', { id: toastId });
    }
  };

  const generatePDFDetalhado = async () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o relatório.'); return; }
    const toastId = toast.loading('Gerando Relatório Detalhado (pode levar um tempo)...');

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        let lastY = 50;

        addHeader(doc, 'Relatório Detalhado de Devoluções');
        
        for (const record of filteredRecords) {
            if (lastY > 220) { doc.addPage(); lastY = 20; addHeader(doc, 'Relatório Detalhado de Devoluções'); }

            doc.setFillColor('#F5F5F5');
            doc.rect(14, lastY, 182, 10, 'F');
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#013D28');
            doc.text(`Registro ID: ${String(record.id).substring(0, 8)} - Data: ${new Date(record.date).toLocaleDateString('pt-BR')}`, 16, lastY + 7);
            lastY += 15;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#333');
            doc.text(`Cliente: ${record.cliente}`, 16, lastY);
            doc.text(`Motorista: ${record.motorista}`, 100, lastY);
            lastY += 5;
            doc.text(`Vendedor: ${record.vendedor}`, 16, lastY);
            doc.text(`Rede: ${record.rede}`, 100, lastY);
            lastY += 10;

            const productBody = record.produtos.map(p => [p.produto, p.quantidade, p.tipo, p.motivo, p.estado || 'N/A']);
            autoTable(doc, {
                head: [['Produto', 'Qtd', 'Tipo', 'Motivo', 'Estado']],
                body: productBody,
                startY: lastY,
                theme: 'grid',
                headStyles: { fillColor: '#F9A03F', textColor: '#fff', fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                didDrawPage: (data) => { lastY = data.cursor?.y || 20; }
            });
            lastY = (doc as any).lastAutoTable.finalY + 5;

            if (record.anexos && record.anexos.length > 0) {
                if (lastY > 230) { doc.addPage(); lastY = 20; }
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Evidências:', 14, lastY);
                lastY += 5;

                const imagePromises = record.anexos.map(url => getImageAsBase64(url));
                const base64Images = await Promise.all(imagePromises);
                
                const imgWidth = 58;
                const imgHeight = 43.5;
                const gap = 4;
                let currentX = 14;

                for (const base64Image of base64Images) {
                    if (lastY + imgHeight > 280) {
                        doc.addPage();
                        lastY = 20;
                        currentX = 14;
                    }
                    if (base64Image) {
                        doc.addImage(base64Image, 'JPEG', currentX, lastY, imgWidth, imgHeight);
                    } else {
                        doc.setFillColor('#EEEEEE');
                        doc.rect(currentX, lastY, imgWidth, imgHeight, 'F');
                        doc.setFontSize(8);
                        doc.setTextColor('#999');
                        doc.text('Falha ao carregar imagem', currentX + imgWidth / 2, lastY + imgHeight / 2, { align: 'center' });
                    }
                    currentX += imgWidth + gap;
                    if (currentX + imgWidth > 196) {
                        currentX = 14;
                        lastY += imgHeight + gap;
                    }
                }
                lastY = currentX === 14 ? lastY : lastY + imgHeight + gap;
            }
            lastY += 5;
            doc.setDrawColor('#DDDDDD');
            doc.line(14, lastY, 196, lastY);
            lastY += 5;
        }

        addFooter(doc);
        doc.save('relatorio_detalhado_gdm.pdf');
        toast.success('Relatório detalhado gerado!', { id: toastId });
    } catch (error) {
        console.error("PDF Generation Error:", error);
        toast.error('Ocorreu um erro ao gerar o PDF detalhado.', { id: toastId });
    }
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
    const EMOJI_CHART = String.fromCodePoint(0x1F4CA);
    let message = `${EMOJI_CHART} *Resumo Geral de Devoluções*\n\n`;
    message += `*Total de Registros:* ${filteredRecords.length}\n`;
    const totalQty = filteredRecords.reduce((sum, rec) => sum + rec.produtos.reduce((pSum, p) => pSum + p.quantidade, 0), 0);
    message += `*Total de Itens Devolvidos:* ${totalQty.toLocaleString('pt-BR')}\n\n`;
    message += '*(Com base nos filtros aplicados)*';
    openWhatsApp(message);
  };
  
  const generateWhatsAppClienteProdutoMotivo = () => {
    if (!hasData) { toast.error('Nenhum dado para gerar o resumo.'); return; }
    const EMOJI_USER = String.fromCodePoint(0x1F464);
    let message = `${EMOJI_USER} *Resumo: Cliente x Produto x Motivo*\n\n`;
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
          <ActionButton onClick={generatePDFDetalhado} disabled={!hasData} className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20">
            <ImageIcon className="h-4 w-4" /> Relatório Detalhado (c/ Imagens)
          </ActionButton>
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
