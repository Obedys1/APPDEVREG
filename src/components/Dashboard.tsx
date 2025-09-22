import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, LabelList
} from 'recharts';
import { TrendingUp, Package, Users, AlertTriangle, UserCheck, Building, BarChart2, Box, Users2, Truck, Info, FileDown, MapPin, Globe, Briefcase, ClipboardCheck } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { useOccurrences } from '../hooks/useOccurrences';
import { FilterState } from '../types';
import { motion } from 'framer-motion';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subDays, isSameMonth, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { LOGO_URL } from '../config';

const CHART_COLORS = ['#013D28', '#F9A03F', '#2E7D32', '#FFB74D', '#4CAF50', '#FFA726', '#81C784', '#FFD54F'];

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; subtitle?: string; }> = ({ icon, title, value, subtitle }) => (
  <motion.div
    className="bg-brand-surface rounded-2xl shadow-lg p-5 flex items-start gap-4"
    whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className="bg-brand-primary/10 p-3 rounded-lg">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-brand-text-muted capitalize">{title}</p>
      <p className="text-lg font-bold text-brand-primary break-words" title={String(value)}>{value}</p>
      {subtitle && <p className="text-xs text-brand-text-muted">{subtitle}</p>}
    </div>
  </motion.div>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactNode; className?: string; actions?: React.ReactNode; }> = ({ title, children, className, actions }) => (
  <div className={`bg-brand-surface rounded-2xl shadow-lg p-6 ${className}`}>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-brand-primary">{title}</h3>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-bold text-brand-primary">{`Período: ${label}`}</p>
        {payload.map((pld: any) => (
          <p key={pld.dataKey} style={{ color: pld.color }}>{`${pld.name}: ${pld.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
};

export const Dashboard: React.FC = () => {
  const { records: devolucoes, filterRecords: filterDevolutions } = useDevolutions();
  const { occurrences, filterOccurrences } = useOccurrences();
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: 'mes_atual', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: '', setor_responsavel: '', motivo_ocorrencia: '', impactos: ''
  });
  const [evolutionFilter, setEvolutionFilter] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const filteredDevolutions = useMemo(() => filterDevolutions(filters), [devolucoes, filters, filterDevolutions]);
  const filteredOccurrences = useMemo(() => filterOccurrences(filters), [occurrences, filters, filterOccurrences]);

  const devolutionStats = useMemo(() => {
    const totalQuantity = filteredDevolutions.reduce((sum, record) => sum + record.produtos.reduce((prodSum, p) => prodSum + p.quantidade, 0), 0);
    const getTopItem = (key: 'produto' | 'cliente' | 'motivo' | 'vendedor' | 'rede' | 'familia' | 'motorista' | 'cidade' | 'uf') => {
      const counts: Record<string, number> = {};
      if (key === 'produto' || key === 'motivo' || key === 'familia') {
        filteredDevolutions.forEach(r => r.produtos.forEach(p => { 
          const itemKey = p[key as 'produto' | 'motivo' | 'familia'];
          if(itemKey) counts[itemKey] = (counts[itemKey] || 0) + 1;
        }));
      } else {
        filteredDevolutions.forEach(r => {
          const itemKey = r[key as 'cliente' | 'vendedor' | 'rede' | 'motorista' | 'cidade' | 'uf'];
          if(itemKey) counts[itemKey] = (counts[itemKey] || 0) + 1;
        });
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? { name: sorted[0][0], count: sorted[0][1] } : null;
    };

    return {
      totalRecords: filteredDevolutions.length,
      totalQuantity: totalQuantity.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      topProduct: getTopItem('produto'), topClient: getTopItem('cliente'), topMotivo: getTopItem('motivo'),
      topVendedor: getTopItem('vendedor'), topRede: getTopItem('rede'), topFamilia: getTopItem('familia'),
      topMotorista: getTopItem('motorista'), topCidade: getTopItem('cidade'), topUf: getTopItem('uf'),
    };
  }, [filteredDevolutions]);

  const occurrenceStats = useMemo(() => {
    const getTopItem = (key: keyof typeof filteredOccurrences[0]) => {
      const counts: Record<string, number> = {};
      filteredOccurrences.forEach(r => {
        const itemKey = r[key] as string;
        if(itemKey) counts[itemKey] = (counts[itemKey] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? { name: sorted[0][0], count: sorted[0][1] } : null;
    };
    return {
      totalRecords: filteredOccurrences.length,
      topMotivo: getTopItem('motivo_ocorrencia'),
      topImpacto: getTopItem('impactos'),
      topSetor: getTopItem('setor_responsavel'),
    };
  }, [filteredOccurrences]);

  const evolutionData = useMemo(() => {
    const allRecords = [
      ...filteredDevolutions.map(r => ({ date: r.date, type: 'devolucao' })),
      ...filteredOccurrences.map(r => ({ date: r.data, type: 'ocorrencia' }))
    ];
    if (allRecords.length === 0) return [];

    const dates = allRecords.map(r => parseISO(r.date));
    const minDate = new Date(Math.min.apply(null, dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max.apply(null, dates.map(d => d.getTime())));

    let intervalPoints: Date[]; let formatFn: (date: Date) => string; let groupFn: (date: Date) => string;

    switch (evolutionFilter) {
      case 'semanal':
        intervalPoints = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
        formatFn = date => format(startOfWeek(date, { weekStartsOn: 1 }), 'dd/MM');
        groupFn = date => format(startOfWeek(date, { weekStartsOn: 1 }), 'dd/MM');
        break;
      case 'mensal':
        intervalPoints = eachMonthOfInterval({ start: minDate, end: maxDate });
        formatFn = date => format(date, 'MMM', { locale: ptBR });
        groupFn = date => format(startOfMonth(date), 'MMM', { locale: ptBR });
        break;
      default:
        intervalPoints = eachDayOfInterval({ start: minDate, end: maxDate });
        formatFn = date => format(date, 'dd/MM');
        groupFn = date => format(date, 'dd/MM');
        break;
    }

    const dataMap = new Map<string, { devolucoes: number, ocorrencias: number }>();
    allRecords.forEach(record => {
      const key = groupFn(parseISO(record.date));
      const current = dataMap.get(key) || { devolucoes: 0, ocorrencias: 0 };
      if (record.type === 'devolucao') current.devolucoes++;
      else current.ocorrencias++;
      dataMap.set(key, current);
    });

    const finalData = intervalPoints.map(point => {
      const name = formatFn(point);
      const values = dataMap.get(name) || { devolucoes: 0, ocorrencias: 0 };
      return { name, ...values };
    });
    
    if (evolutionFilter === 'mensal') {
      const monthsOrder = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      finalData.sort((a, b) => monthsOrder.indexOf(a.name.toLowerCase()) - monthsOrder.indexOf(b.name.toLowerCase()));
    }
    return finalData;
  }, [filteredDevolutions, filteredOccurrences, evolutionFilter]);

  const chartData = useMemo(() => {
    const getTopN = (data: any[], key: string, n: number, countKey?: string) => {
      const counts: Record<string, number> = {};
      data.forEach(item => {
        const itemKey = item[key];
        if (itemKey) counts[itemKey] = (counts[itemKey] || 0) + (countKey ? item[countKey] : 1);
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([name, value]) => ({ name: name.substring(0, 25) + (name.length > 25 ? '...' : ''), value, fullName: name }));
    };

    return {
      devolutionMotives: getTopN(filteredDevolutions.flatMap(r => r.produtos), 'motivo', 10),
      devolutionTopProducts: getTopN(filteredDevolutions.flatMap(r => r.produtos), 'produto', 5, 'quantidade'),
      devolutionTopClients: getTopN(filteredDevolutions, 'cliente', 5),
      devolutionRede: getTopN(filteredDevolutions, 'rede', 5),
      devolutionVendedor: getTopN(filteredDevolutions, 'vendedor', 5),
      
      occurrenceTopClients: getTopN(filteredOccurrences, 'cliente', 10),
      occurrenceTopMotives: getTopN(filteredOccurrences, 'motivo_ocorrencia', 10),
      occurrenceTopImpacts: getTopN(filteredOccurrences, 'impactos', 10),
      occurrenceTopSectors: getTopN(filteredOccurrences, 'setor_responsavel', 5),
      occurrenceVendedor: getTopN(filteredOccurrences, 'vendedor', 5),
    };
  }, [filteredDevolutions, filteredOccurrences]);

  const clearFilters = () => setFilters({ 
    search: '', startDate: '', endDate: '', period: 'mes_atual', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: '', setor_responsavel: '', motivo_ocorrencia: '', impactos: ''
  });

  const handleDownloadPdf = async () => {
    if (!dashboardRef.current) return;
    setIsDownloadingPdf(true);
    const toastId = toast.loading('Gerando PDF do dashboard...');
    try {
        const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: '#FBF5EB' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height + 70] });
        const logoBase64 = await getBase64ImageFromUrl(LOGO_URL);
        pdf.addImage(logoBase64, 'PNG', (canvas.width - 120) / 2, 10, 120, 60);
        pdf.addImage(imgData, 'PNG', 0, 70, canvas.width, canvas.height);
        pdf.save(`dashboard-gdm-${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('PDF gerado com sucesso!', { id: toastId });
    } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Falha ao gerar o PDF.', { id: toastId });
    } finally {
        setIsDownloadingPdf(false);
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-8 p-1">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-4xl font-bold text-brand-primary">Dashboard</h1>
        <div className="flex items-center gap-4">
          <button onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-primary text-white font-medium hover:bg-opacity-90 rounded-lg transition-colors disabled:opacity-50">
            <FileDown className="h-4 w-4" /> {isDownloadingPdf ? 'Gerando...' : 'Dashboard em PDF'}
          </button>
        </div>
      </div>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} moduleType="dashboard" />

      <h2 className="text-2xl font-semibold text-brand-primary pt-4 border-t border-gray-200">Análise de Devoluções</h2>
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
        <StatCard icon={<BarChart2 className="h-6 w-6 text-brand-primary" />} title="Total de devoluções" value={devolutionStats.totalRecords} />
        <StatCard icon={<Box className="h-6 w-6 text-brand-secondary" />} title="Qtd. total de itens" value={devolutionStats.totalQuantity} />
        <StatCard icon={<Package className="h-6 w-6 text-brand-primary" />} title="Top produto (ocorr.)" value={devolutionStats.topProduct?.name || '-'} subtitle={`${devolutionStats.topProduct?.count || 0} ocorr.`} />
        <StatCard icon={<Users className="h-6 w-6 text-brand-secondary" />} title="Top cliente" value={devolutionStats.topClient?.name || '-'} subtitle={`${devolutionStats.topClient?.count || 0} dev.`} />
        <StatCard icon={<AlertTriangle className="h-6 w-6 text-brand-accent" />} title="Top motivo" value={devolutionStats.topMotivo?.name || '-'} subtitle={`${devolutionStats.topMotivo?.count || 0} ocorr.`} />
        <StatCard icon={<UserCheck className="h-6 w-6 text-brand-primary" />} title="Top vendedor" value={devolutionStats.topVendedor?.name || '-'} subtitle={`${devolutionStats.topVendedor?.count || 0} dev.`} />
      </motion.div>

      <h2 className="text-2xl font-semibold text-brand-primary pt-4 border-t border-gray-200">Análise de Ocorrências</h2>
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
        <StatCard icon={<BarChart2 className="h-6 w-6 text-brand-primary" />} title="Total de ocorrências" value={occurrenceStats.totalRecords} />
        <StatCard icon={<AlertTriangle className="h-6 w-6 text-brand-accent" />} title="Top motivo ocorr." value={occurrenceStats.topMotivo?.name || '-'} subtitle={`${occurrenceStats.topMotivo?.count || 0} ocorr.`} />
        <StatCard icon={<ClipboardCheck className="h-6 w-6 text-brand-secondary" />} title="Top impacto" value={occurrenceStats.topImpacto?.name || '-'} subtitle={`${occurrenceStats.topImpacto?.count || 0} ocorr.`} />
        <StatCard icon={<Briefcase className="h-6 w-6 text-brand-primary" />} title="Top setor" value={occurrenceStats.topSetor?.name || '-'} subtitle={`${occurrenceStats.topSetor?.count || 0} ocorr.`} />
      </motion.div>

      <ChartContainer title="Evolução de Registros" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
            <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 12 }} />
            <YAxis stroke="#999" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="devolucoes" name="Devoluções" stroke="#013D28" strokeWidth={2} />
            <Line type="monotone" dataKey="ocorrencias" name="Ocorrências" stroke="#F9A03F" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Devoluções por Motivo (Top 10)"><ResponsiveContainer width="100%" height={300}><BarChart data={chartData.devolutionMotives} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#00000010" /><XAxis type="number" stroke="#999" tick={{ fontSize: 12 }} allowDecimals={false} /><YAxis dataKey="name" type="category" stroke="#999" tick={{ fontSize: 12, width: 100 }} width={110} /><Tooltip cursor={{ fill: 'rgba(1, 61, 40, 0.1)' }} /><Bar dataKey="value" name="Ocorrências" fill="#013D28"><LabelList dataKey="value" position="right" style={{ fill: '#013D28', fontSize: 12 }} /></Bar></BarChart></ResponsiveContainer></ChartContainer>
        <ChartContainer title="Top 5 Produtos (Qtd Devolvida)"><ResponsiveContainer width="100%" height={300}><BarChart data={chartData.devolutionTopProducts} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#00000010" /><XAxis dataKey="name" stroke="#999" tick={{ fontSize: 12 }} /><YAxis stroke="#999" tick={{ fontSize: 12 }} /><Tooltip cursor={{ fill: 'rgba(249, 160, 63, 0.1)' }} /><Bar dataKey="value" name="Qtd. Devolvida" fill="#F9A03F"><LabelList dataKey="value" position="top" style={{ fill: '#F9A03F', fontSize: 12 }} formatter={(value: number) => value.toLocaleString('pt-BR')} /></Bar></BarChart></ResponsiveContainer></ChartContainer>
        <ChartContainer title="Top 5 Clientes com Devolução" className="lg:col-span-2"><ResponsiveContainer width="100%" height={300}><BarChart data={chartData.devolutionTopClients} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#00000010" /><XAxis dataKey="name" stroke="#999" tick={{ fontSize: 12 }} /><YAxis stroke="#999" tick={{ fontSize: 12 }} allowDecimals={false} /><Tooltip cursor={{ fill: 'rgba(1, 61, 40, 0.1)' }} /><Bar dataKey="value" name="Devoluções" fill="#2E7D32"><LabelList dataKey="value" position="top" style={{ fill: '#2E7D32', fontSize: 12 }} /></Bar></BarChart></ResponsiveContainer></ChartContainer>
        <ChartContainer title="Devoluções por Rede"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={chartData.devolutionRede} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} >{chartData.devolutionRede.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartContainer>
        <ChartContainer title="Devoluções por Vendedor"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={chartData.devolutionVendedor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} >{chartData.devolutionVendedor.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS.slice(2)[index % CHART_COLORS.slice(2).length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
        <ChartContainer title="Ocorrências por Motivo (Top 10)"><ResponsiveContainer width="100%" height={300}><BarChart data={chartData.occurrenceTopMotives} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#00000010" /><XAxis type="number" stroke="#999" tick={{ fontSize: 12 }} allowDecimals={false} /><YAxis dataKey="name" type="category" stroke="#999" tick={{ fontSize: 12, width: 100 }} width={110} /><Tooltip cursor={{ fill: 'rgba(255, 183, 77, 0.1)' }} /><Bar dataKey="value" name="Ocorrências" fill="#FFB74D"><LabelList dataKey="value" position="right" style={{ fill: '#013D28', fontSize: 12 }} /></Bar></BarChart></ResponsiveContainer></ChartContainer>
        <ChartContainer title="Ocorrências por Impacto (Top 10)"><ResponsiveContainer width="100%" height={300}><BarChart data={chartData.occurrenceTopImpacts} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#00000010" /><XAxis type="number" stroke="#999" tick={{ fontSize: 12 }} allowDecimals={false} /><YAxis dataKey="name" type="category" stroke="#999" tick={{ fontSize: 12, width: 100 }} width={110} /><Tooltip cursor={{ fill: 'rgba(255, 112, 67, 0.1)' }} /><Bar dataKey="value" name="Ocorrências" fill="#FF7043"><LabelList dataKey="value" position="right" style={{ fill: '#013D28', fontSize: 12 }} /></Bar></BarChart></ResponsiveContainer></ChartContainer>
        <ChartContainer title="Top 10 Clientes com Ocorrências" className="lg:col-span-2"><ResponsiveContainer width="100%" height={300}><BarChart data={chartData.occurrenceTopClients} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#00000010" /><XAxis dataKey="name" stroke="#999" tick={{ fontSize: 12 }} /><YAxis stroke="#999" tick={{ fontSize: 12 }} allowDecimals={false} /><Tooltip cursor={{ fill: 'rgba(76, 175, 80, 0.1)' }} /><Bar dataKey="value" name="Ocorrências" fill="#4CAF50"><LabelList dataKey="value" position="top" style={{ fill: '#4CAF50', fontSize: 12 }} /></Bar></BarChart></ResponsiveContainer></ChartContainer>
        <ChartContainer title="Top 5 Setores com Ocorrências"><ResponsiveContainer width="100%" height={300}><BarChart data={chartData.occurrenceTopSectors} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#00000010" /><XAxis dataKey="name" stroke="#999" tick={{ fontSize: 12 }} /><YAxis stroke="#999" tick={{ fontSize: 12 }} allowDecimals={false} /><Tooltip cursor={{ fill: 'rgba(129, 199, 132, 0.1)' }} /><Bar dataKey="value" name="Ocorrências" fill="#81C784"><LabelList dataKey="value" position="top" style={{ fill: '#81C784', fontSize: 12 }} /></Bar></BarChart></ResponsiveContainer></ChartContainer>
        <ChartContainer title="Ocorrências por Vendedor"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={chartData.occurrenceVendedor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} >{chartData.occurrenceVendedor.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS.slice(4)[index % CHART_COLORS.slice(4).length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartContainer>
      </div>
    </div>
  );
};
