import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, LabelList
} from 'recharts';
import { TrendingUp, Package, Users, AlertTriangle, UserCheck, Building, BarChart2, Box } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { FilterState } from '../types';
import { motion } from 'framer-motion';
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CHART_COLORS = ['#013D28', '#F9A03F', '#2E7D32', '#FFB74D', '#4CAF50', '#FFA726', '#81C784', '#FFD54F'];

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; subtitle?: string; }> = ({ icon, title, value, subtitle }) => (
  <motion.div
    className="bg-brand-surface rounded-2xl shadow-lg p-6 flex items-start gap-4"
    whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className="bg-brand-primary/10 p-3 rounded-lg">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-brand-text-muted">{title}</p>
      <p className="text-2xl font-bold text-brand-primary truncate" title={String(value)}>{value}</p>
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
        <p className="font-bold text-brand-primary">{`Data: ${label}`}</p>
        <p className="text-sm text-brand-secondary">{`Devoluções: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC = () => {
  const { records, filterRecords } = useDevolutions();
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: 'mes_atual', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });
  const [evolutionFilter, setEvolutionFilter] = useState<'diario' | 'semanal' | 'mensal'>('diario');

  const filteredRecords = useMemo(() => filterRecords(filters), [records, filters, filterRecords]);

  const stats = useMemo(() => {
    const totalQuantity = filteredRecords.reduce((sum, record) => sum + record.produtos.reduce((prodSum, p) => prodSum + p.quantidade, 0), 0);
    
    const getTopItem = (key: 'produto' | 'cliente' | 'motivo' | 'vendedor' | 'rede') => {
      const counts: Record<string, number> = {};
      if (key === 'produto' || key === 'motivo') {
        filteredRecords.forEach(r => r.produtos.forEach(p => { 
          const itemKey = p[key as 'produto' | 'motivo'];
          counts[itemKey] = (counts[itemKey] || 0) + 1;
        }));
      } else {
        filteredRecords.forEach(r => {
          const itemKey = r[key as 'cliente' | 'vendedor' | 'rede'];
          counts[itemKey] = (counts[itemKey] || 0) + 1;
        });
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? { name: sorted[0][0], count: sorted[0][1] } : null;
    };

    return {
      totalRecords: filteredRecords.length,
      totalQuantity: totalQuantity.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      topProduct: getTopItem('produto'),
      topClient: getTopItem('cliente'),
      topMotivo: getTopItem('motivo'),
      topVendedor: getTopItem('vendedor'),
      topRede: getTopItem('rede'),
    };
  }, [filteredRecords]);

  const evolutionData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    filteredRecords.forEach(record => {
      const date = parseISO(record.date);
      let key: string;
      if (evolutionFilter === 'diario') {
        key = format(date, 'dd/MM');
      } else if (evolutionFilter === 'semanal') {
        key = format(startOfWeek(date, { weekStartsOn: 1 }), 'dd/MM');
      } else { // mensal
        key = format(startOfMonth(date), 'MMM', { locale: ptBR });
      }
      grouped[key] = (grouped[key] || 0) + 1;
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        if (evolutionFilter === 'mensal') {
            const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
            return months.indexOf(a.toLowerCase()) - months.indexOf(b.toLowerCase());
        }
        const [dayA, monthA] = a.split('/');
        const [dayB, monthB] = b.split('/');
        return new Date(`${new Date().getFullYear()}-${monthA}-${dayA}`).getTime() - new Date(`${new Date().getFullYear()}-${monthB}-${dayB}`).getTime();
    });

    return sortedKeys.map(key => ({ name: key, devolucoes: grouped[key] }));
  }, [filteredRecords, evolutionFilter]);

  const chartData = useMemo(() => {
    const getTopN = (key: 'produto' | 'cliente' | 'motivo' | 'vendedor' | 'rede', n: number) => {
      const counts: Record<string, number> = {};
      if (key === 'produto' || key === 'motivo') {
        filteredRecords.forEach(r => r.produtos.forEach(p => { 
          const itemKey = p[key as 'produto' | 'motivo'];
          if(itemKey) counts[itemKey] = (counts[itemKey] || 0) + 1;
        }));
      } else {
        filteredRecords.forEach(r => {
          const itemKey = r[key as 'cliente' | 'vendedor' | 'rede'];
          if(itemKey) counts[itemKey] = (counts[itemKey] || 0) + 1;
        });
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([name, value]) => ({ name: name.substring(0, 25) + (name.length > 25 ? '...' : ''), value, fullName: name }));
    };

    return {
      motivoData: getTopN('motivo', 10),
      topProdutos: getTopN('produto', 5).reverse(),
      topClientes: getTopN('cliente', 5).reverse(),
      redeData: getTopN('rede', 5),
      vendedorData: getTopN('vendedor', 5),
    };
  }, [filteredRecords]);

  const clearFilters = () => setFilters({ 
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

  const EvolutionFilterButton: React.FC<{ type: 'diario' | 'semanal' | 'mensal', label: string }> = ({ type, label }) => (
    <button 
      onClick={() => setEvolutionFilter(type)}
      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${evolutionFilter === type ? 'bg-brand-secondary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-4xl font-bold text-brand-primary">Dashboard</h1>
        <div className="text-sm text-brand-text-muted font-medium">
          {filteredRecords.length > 0 ? `Exibindo ${filteredRecords.length} de ${records.length} registros` : 'Nenhum registro encontrado'}
        </div>
      </div>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} />

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
        initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        <StatCard icon={<BarChart2 className="h-6 w-6 text-brand-primary" />} title="Total Devoluções" value={stats.totalRecords} />
        <StatCard icon={<Box className="h-6 w-6 text-brand-secondary" />} title="Qtd. Total Itens" value={stats.totalQuantity} />
        <StatCard icon={<Package className="h-6 w-6 text-brand-primary" />} title="Top Produto" value={stats.topProduct?.name || '-'} subtitle={`${stats.topProduct?.count || 0} ocorr.`} />
        <StatCard icon={<Users className="h-6 w-6 text-brand-secondary" />} title="Top Cliente" value={stats.topClient?.name || '-'} subtitle={`${stats.topClient?.count || 0} dev.`} />
        <StatCard icon={<AlertTriangle className="h-6 w-6 text-brand-accent" />} title="Top Motivo" value={stats.topMotivo?.name || '-'} subtitle={`${stats.topMotivo?.count || 0} ocorr.`} />
        <StatCard icon={<UserCheck className="h-6 w-6 text-brand-primary" />} title="Top Vendedor" value={stats.topVendedor?.name || '-'} subtitle={`${stats.topVendedor?.count || 0} dev.`} />
        <StatCard icon={<Building className="h-6 w-6 text-brand-secondary" />} title="Top Rede" value={stats.topRede?.name || '-'} subtitle={`${stats.topRede?.count || 0} dev.`} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer 
          title="Evolução de Devoluções"
          className="lg:col-span-2"
          actions={
            <>
              <EvolutionFilterButton type="diario" label="Diário" />
              <EvolutionFilterButton type="semanal" label="Semanal" />
              <EvolutionFilterButton type="mensal" label="Mensal" />
            </>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
              <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 12 }} />
              <YAxis stroke="#999" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="devolucoes" name="Devoluções" stroke="#013D28" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Devoluções por Motivo">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.motivoData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
              <XAxis type="number" stroke="#999" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" stroke="#999" tick={{ fontSize: 12 }} width={80} />
              <Tooltip cursor={{ fill: 'rgba(1, 61, 40, 0.1)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px' }} />
              <Bar dataKey="value" name="Ocorrências" fill="#013D28">
                <LabelList dataKey="value" position="right" style={{ fill: '#013D28', fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Top 5 Produtos com Devolução">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.topProdutos} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
              <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 12 }} />
              <YAxis stroke="#999" tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(249, 160, 63, 0.1)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px' }} />
              <Bar dataKey="value" name="Ocorrências" fill="#F9A03F">
                <LabelList dataKey="value" position="top" style={{ fill: '#F9A03F', fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Top 5 Clientes com Devolução" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.topClientes} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
              <XAxis type="number" stroke="#999" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" stroke="#999" tick={{ fontSize: 12 }} width={120} />
              <Tooltip cursor={{ fill: 'rgba(1, 61, 40, 0.1)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px' }} />
              <Bar dataKey="value" name="Devoluções" fill="#2E7D32">
                <LabelList dataKey="value" position="right" style={{ fill: '#2E7D32', fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Devoluções por Rede">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={chartData.redeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {chartData.redeData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Devoluções por Vendedor">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={chartData.vendedorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {chartData.vendedorData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS.slice(2)[index % CHART_COLORS.slice(2).length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};
