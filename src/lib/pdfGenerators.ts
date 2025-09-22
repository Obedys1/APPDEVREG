import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DevolutionRecord, OccurrenceRecord } from '../types';
import { LOGO_URL } from '../config';
import { format, parseISO } from 'date-fns';

// --- HELPERS ---

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const drawHeader = (doc: jsPDF, logoBase64: string, title: string) => {
  doc.addImage(logoBase64, 'PNG', 14, 10, 40, 20);
  doc.setFontSize(18);
  doc.setTextColor('#013D28');
  doc.text(title, 105, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor('#333333');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 28, { align: 'center' });
  doc.setDrawColor('#013D28');
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);
};

const addHeaderAndFooter = (doc: jsPDF, logoBase64: string, title: string) => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawHeader(doc, logoBase64, title);
        doc.setFontSize(8);
        doc.setTextColor('#666666');
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }
};

const drawStatCardsDevolucoes = (doc: jsPDF, stats: any, startY: number): number => {
    if (!stats) return startY;
    let y = startY;
    doc.setFontSize(12); doc.setTextColor('#013D28'); doc.text('Resumo Estatístico de Devoluções', 14, y);
    y += 7;
    const cardWidth = 58; const cardHeight = 18; const gap = 5; let x = 14;
    const statItems = [
        { title: 'Total Devoluções', value: stats.totalRecords }, { title: 'Qtd. Total Itens', value: stats.totalQuantity },
        { title: 'Top Motivo', value: stats.topMotives?.name || '-' }, { title: 'Top Cliente', value: stats.topClients?.name || '-' },
        { title: 'Top Produto (Qtd)', value: stats.topProducts?.name || '-' }, { title: 'Top UF', value: stats.topUF?.name || '-' },
    ].filter(item => item.value);
    statItems.forEach((item) => {
        if (x + cardWidth > doc.internal.pageSize.width - 14) { x = 14; y += cardHeight + gap; }
        doc.setFillColor('#FBF5EB'); doc.setDrawColor('#E0D9CE'); doc.setLineWidth(0.2); doc.rect(x, y, cardWidth, cardHeight, 'FD');
        doc.setFontSize(8); doc.setTextColor('#666666'); doc.text(item.title, x + 4, y + 6);
        doc.setFontSize(10); doc.setTextColor('#013D28'); const valueText = String(item.value).substring(0, 25); doc.text(valueText, x + 4, y + 13);
        x += cardWidth + gap;
    });
    return y + cardHeight + 10;
};

const drawStatCardsOcorrencias = (doc: jsPDF, stats: any, startY: number): number => {
    if (!stats) return startY;
    let y = startY;
    doc.setFontSize(12); doc.setTextColor('#013D28'); doc.text('Resumo Estatístico de Ocorrências', 14, y);
    y += 7;
    const cardWidth = 58; const cardHeight = 18; const gap = 5; let x = 14;
    const statItems = [
        { title: 'Total Ocorrências', value: stats.totalRecords }, { title: 'Top Motivo', value: stats.topMotivoOcorrencia?.name || '-' },
        { title: 'Top Setor', value: stats.topSetorResponsavel?.name || '-' }, { title: 'Top Impacto', value: stats.topImpacto?.name || '-' },
        { title: 'Top Cliente', value: stats.topClients?.name || '-' }, { title: 'Top Vendedor', value: stats.topVendedor?.name || '-' },
    ].filter(item => item.value);
    statItems.forEach((item) => {
        if (x + cardWidth > doc.internal.pageSize.width - 14) { x = 14; y += cardHeight + gap; }
        doc.setFillColor('#FBF5EB'); doc.setDrawColor('#E0D9CE'); doc.setLineWidth(0.2); doc.rect(x, y, cardWidth, cardHeight, 'FD');
        doc.setFontSize(8); doc.setTextColor('#666666'); doc.text(item.title, x + 4, y + 6);
        doc.setFontSize(10); doc.setTextColor('#013D28'); const valueText = String(item.value).substring(0, 25); doc.text(valueText, x + 4, y + 13);
        x += cardWidth + gap;
    });
    return y + cardHeight + 10;
};

// --- DEVOLUÇÕES PDFS ---

export const generateGeralDevolucoesPDF = async (records: DevolutionRecord[], stats: any) => {
    const doc = new jsPDF(); const logoBase64 = await getBase64ImageFromUrl(LOGO_URL); let yPos = 40;
    yPos = drawStatCardsDevolucoes(doc, stats, yPos);
    const tableColumn = ["Data", "Cliente", "Produto", "Qtd", "Motivo", "Vendedor", "Status"];
    const tableRows: any[] = records.flatMap(r => r.produtos.map(p => [format(parseISO(r.date), 'dd/MM/yyyy'), r.cliente, p.produto, p.quantidade, p.motivo, r.vendedor, r.status]));
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: yPos, theme: 'striped', headStyles: { fillColor: '#013D28' } });
    addHeaderAndFooter(doc, logoBase64, 'Relatório Geral de Devoluções');
    doc.save(`relatorio_geral_devolucoes_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateDetalhadoPDF = async (records: DevolutionRecord[], stats: any) => {
    const doc = new jsPDF(); const logoBase64 = await getBase64ImageFromUrl(LOGO_URL); let yPos = 40;
    yPos = drawStatCardsDevolucoes(doc, stats, yPos);
    for (const record of records) {
        let estimatedHeight = 40 + (record.produtos.length * 8) + (record.anexos.length > 0 ? 70 : 0);
        if (yPos + estimatedHeight > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = drawStatCardsDevolucoes(doc, stats, 40); }
        const rectStartY = yPos - 2;
        doc.setFontSize(10); doc.setTextColor('#333333');
        doc.text(`Registro ID: ${String(record.id).substring(0, 8)}`, 16, yPos); doc.text(`Data: ${format(parseISO(record.date), 'dd/MM/yyyy')}`, 105, yPos, { align: 'center' }); yPos += 7;
        doc.text(`Cliente: ${record.cliente}`, 16, yPos); doc.text(`Motorista: ${record.motorista}`, 105, yPos, { align: 'center' }); yPos += 7;
        doc.text(`Vendedor: ${record.vendedor}`, 16, yPos); doc.text(`Rede: ${record.rede}`, 105, yPos, { align: 'center' }); yPos += 10;
        autoTable(doc, { startY: yPos, head: [['Produto', 'Qtd', 'Tipo', 'Motivo', 'Estado']], body: record.produtos.map(p => [p.produto, p.quantidade, p.tipo, p.motivo, p.estado || '-']), theme: 'striped', headStyles: { fillColor: '#013D28' } });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        if (record.anexos && record.anexos.length > 0) {
            if (yPos + 65 > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = 40; }
            doc.setFontSize(12); doc.setTextColor('#013D28'); doc.text('Evidências:', 16, yPos); yPos += 8;
            let xPos = 16;
            for (const url of record.anexos) {
                if (xPos + 58 > doc.internal.pageSize.width - 16) { xPos = 16; yPos += 58 + 5; if (yPos + 58 > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = 40; } }
                try { const imgBase64 = await getBase64ImageFromUrl(url); doc.addImage(imgBase64, 'PNG', xPos, yPos, 58, 58); } catch (e) { doc.setFillColor('#EEEEEE'); doc.rect(xPos, yPos, 58, 58, 'F'); doc.setFontSize(8); doc.setTextColor('#666666'); doc.text('Erro Imagem', xPos + 29, yPos + 29, { align: 'center' }); }
                xPos += 58 + 5;
            }
            yPos += 58;
        }
        doc.setDrawColor('#E0D9CE'); doc.setLineWidth(0.2); doc.rect(14, rectStartY, doc.internal.pageSize.width - 28, yPos - rectStartY + 5);
        yPos += 10;
    }
    addHeaderAndFooter(doc, logoBase64, 'Relatório Detalhado de Devoluções');
    doc.save(`relatorio_detalhado_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateProdutoMotivoEstadoPDF = async (records: DevolutionRecord[], stats: any) => {
    const doc = new jsPDF(); const logoBase64 = await getBase64ImageFromUrl(LOGO_URL); let yPos = 40;
    yPos = drawStatCardsDevolucoes(doc, stats, yPos);
    const groupedByProduct = records.flatMap(r => r.produtos).reduce((acc, p) => {
        if (!acc[p.produto]) { acc[p.produto] = { total: 0, details: {} }; }
        acc[p.produto].total += p.quantidade; const key = `${p.motivo}-${p.estado || 'N/A'}`;
        if (!acc[p.produto].details[key]) { acc[p.produto].details[key] = { motivo: p.motivo, estado: p.estado || 'N/A', quantidade: 0 }; }
        acc[p.produto].details[key].quantidade += p.quantidade; return acc;
    }, {} as Record<string, { total: number; details: Record<string, { motivo: string; estado: string; quantidade: number }> }>);
    for (const [produto, data] of Object.entries(groupedByProduct)) {
        const tableBody = Object.values(data.details).map(d => [d.motivo, d.estado, d.quantidade]);
        if (yPos + (tableBody.length + 1) * 10 + 20 > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = 40; }
        doc.setFontSize(12); doc.setTextColor('#013D28'); doc.text(produto, 14, yPos); yPos += 5;
        doc.setFontSize(9); doc.setTextColor('#333333'); doc.text(`Total Devolvido: ${data.total.toLocaleString('pt-BR')}`, 14, yPos); yPos += 5;
        autoTable(doc, { startY: yPos, head: [['Motivo', 'Estado', 'Quantidade']], body: tableBody, theme: 'grid', headStyles: { fillColor: '#013D28' } });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    addHeaderAndFooter(doc, logoBase64, 'Relatório: Produto x Motivo x Estado');
    doc.save(`relatorio_produto_motivo_estado_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateClienteProdutoMotivoPDF = async (records: DevolutionRecord[], stats: any) => {
    const doc = new jsPDF(); const logoBase64 = await getBase64ImageFromUrl(LOGO_URL); let yPos = 40;
    yPos = drawStatCardsDevolucoes(doc, stats, yPos);
    const grouped = records.reduce((acc, r) => {
        if (!acc[r.cliente]) acc[r.cliente] = {};
        r.produtos.forEach(p => {
            if (!acc[r.cliente][p.produto]) acc[r.cliente][p.produto] = {};
            acc[r.cliente][p.produto][p.motivo] = (acc[r.cliente][p.produto][p.motivo] || 0) + p.quantidade;
        }); return acc;
    }, {} as Record<string, Record<string, Record<string, number>>>);
    for (const [cliente, produtos] of Object.entries(grouped)) {
        if (yPos > 45) yPos += 10; if (yPos + 20 > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = 40; }
        doc.setFontSize(14); doc.setTextColor('#013D28'); doc.text(`Cliente: ${cliente}`, 14, yPos); yPos += 10;
        for (const [produto, motivos] of Object.entries(produtos)) {
            const tableBody = Object.entries(motivos).map(([motivo, qtd]) => [motivo, qtd]);
            if (yPos + (tableBody.length + 1) * 10 + 15 > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = 40; }
            doc.setFontSize(11); doc.setTextColor('#333333'); doc.text(`Produto: ${produto}`, 16, yPos); yPos += 5;
            autoTable(doc, { startY: yPos, head: [['Motivo', 'Quantidade']], body: tableBody, theme: 'grid', headStyles: { fillColor: '#013D28' }, margin: { left: 16 } });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }
    }
    addHeaderAndFooter(doc, logoBase64, 'Relatório: Cliente x Produto x Motivo');
    doc.save(`relatorio_cliente_produto_motivo_${new Date().toISOString().split('T')[0]}.pdf`);
};

// --- OCORRÊNCIAS PDFS ---

export const generateGeralOcorrenciasPDF = async (records: OccurrenceRecord[], stats: any) => {
    const doc = new jsPDF(); const logoBase64 = await getBase64ImageFromUrl(LOGO_URL); let yPos = 40;
    yPos = drawStatCardsOcorrencias(doc, stats, yPos);
    const tableColumn = ["Data", "Cliente", "Motivo", "Setor", "Impacto", "Vendedor"];
    const tableRows: any[] = records.map(r => [format(parseISO(r.data), 'dd/MM/yyyy'), r.cliente, r.motivo_ocorrencia, r.setor_responsavel, r.impactos, r.vendedor]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: yPos, theme: 'striped', headStyles: { fillColor: '#013D28' } });
    addHeaderAndFooter(doc, logoBase64, 'Relatório Geral de Ocorrências');
    doc.save(`relatorio_geral_ocorrencias_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateClienteMotivoOcorrenciaPDF = async (records: OccurrenceRecord[], stats: any) => {
    const doc = new jsPDF(); const logoBase64 = await getBase64ImageFromUrl(LOGO_URL); let yPos = 40;
    yPos = drawStatCardsOcorrencias(doc, stats, yPos);
    const grouped = records.reduce((acc, r) => {
        if (!acc[r.cliente]) acc[r.cliente] = {};
        acc[r.cliente][r.motivo_ocorrencia] = (acc[r.cliente][r.motivo_ocorrencia] || 0) + 1;
        return acc;
    }, {} as Record<string, Record<string, number>>);
    for (const [cliente, motivos] of Object.entries(grouped)) {
        const tableBody = Object.entries(motivos).map(([motivo, qtd]) => [motivo, qtd]);
        if (yPos + (tableBody.length + 1) * 10 + 15 > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = 40; }
        doc.setFontSize(12); doc.setTextColor('#013D28'); doc.text(`Cliente: ${cliente}`, 14, yPos); yPos += 8;
        autoTable(doc, { startY: yPos, head: [['Motivo da Ocorrência', 'Quantidade']], body: tableBody, theme: 'grid', headStyles: { fillColor: '#013D28' } });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    addHeaderAndFooter(doc, logoBase64, 'Relatório: Cliente x Motivo Ocorrência');
    doc.save(`relatorio_cliente_motivo_ocorrencia_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateSetorImpactoPDF = async (records: OccurrenceRecord[], stats: any) => {
    const doc = new jsPDF(); const logoBase64 = await getBase64ImageFromUrl(LOGO_URL); let yPos = 40;
    yPos = drawStatCardsOcorrencias(doc, stats, yPos);
    const grouped = records.reduce((acc, r) => {
        if (!acc[r.setor_responsavel]) acc[r.setor_responsavel] = {};
        acc[r.setor_responsavel][r.impactos] = (acc[r.setor_responsavel][r.impactos] || 0) + 1;
        return acc;
    }, {} as Record<string, Record<string, number>>);
    for (const [setor, impactos] of Object.entries(grouped)) {
        const tableBody = Object.entries(impactos).map(([impacto, qtd]) => [impacto, qtd]);
        if (yPos + (tableBody.length + 1) * 10 + 15 > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = 40; }
        doc.setFontSize(12); doc.setTextColor('#013D28'); doc.text(`Setor Responsável: ${setor}`, 14, yPos); yPos += 8;
        autoTable(doc, { startY: yPos, head: [['Impacto Gerado', 'Quantidade']], body: tableBody, theme: 'grid', headStyles: { fillColor: '#013D28' } });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    addHeaderAndFooter(doc, logoBase64, 'Relatório: Setor Responsável x Impactos');
    doc.save(`relatorio_setor_impacto_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateResumosOcorrenciasPDF = async (records: OccurrenceRecord[], stats: any) => {
    const doc = new jsPDF(); const logoBase64 = await getBase64ImageFromUrl(LOGO_URL); let yPos = 40;
    yPos = drawStatCardsOcorrencias(doc, stats, yPos);
    const generateSummaryTable = (title: string, key: keyof OccurrenceRecord) => {
        const counts = records.reduce((acc, r) => {
            const itemKey = r[key] as string;
            if (itemKey) acc[itemKey] = (acc[itemKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const tableBody = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => [name, count]);
        if (yPos + (tableBody.length + 1) * 10 + 15 > doc.internal.pageSize.height - 20) { doc.addPage(); yPos = 40; }
        doc.setFontSize(12); doc.setTextColor('#013D28'); doc.text(title, 14, yPos); yPos += 8;
        autoTable(doc, { startY: yPos, head: [['Item', 'Quantidade']], body: tableBody, theme: 'grid', headStyles: { fillColor: '#013D28' } });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    };
    generateSummaryTable('Resumo por Setor Responsável', 'setor_responsavel');
    generateSummaryTable('Resumo por Motivo da Ocorrência', 'motivo_ocorrencia');
    generateSummaryTable('Resumo por Impactos', 'impactos');
    generateSummaryTable('Resumo por Vendedor', 'vendedor');
    addHeaderAndFooter(doc, logoBase64, 'Relatório de Resumos de Ocorrências');
    doc.save(`relatorio_resumos_ocorrencias_${new Date().toISOString().split('T')[0]}.pdf`);
};
