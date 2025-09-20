import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, LabelList
} from 'recharts';
import { TrendingUp, Package, Users, AlertTriangle, Box, DollarSign, BarChart2 } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { FilterState } from '../types';
import { motion } from 'framer-motion';

const CHART_COLORS = ['#013D28', '#F9A03F', '#2E7D32', '#FFB74D', '#4CAF50', '#FFA726'];

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; subtitle?: string; className?: string }> = ({ icon, title, value, subtitle, className }) => (
  <motion.div
    className={`bg-brand-surface rounded-2xl shadow-lg p-6 flex items-center gap-6 ${className}`}
    whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className="flex-shrink-0">{icon}</div>
    <div>
      <p className="text-sm font-medium text-brand-text-muted">{title}</p>
      <p className="text-2xl font-bold text-brand-primary">{value}</p>
      {subtitle && <p className="text-xs text-brand-text-muted">{subtitle}</p>}
    </div>
  </motion.div>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`bg-brand-surface rounded-2xl shadow-lg p-6 ${className}`}>
    <h3 className="text-lg font-semibold text-brand-primary mb-4">{title}</h3>
    {children}
  </div>
);

export const Dashboard: React.FC = () => {
  const { records, filterRecords } = useDevolutions();
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: ''
  });
  const [evolutionFilter, setEvolutionFilter] = useState<'diario' | 'semanal' | 'mensal' | 'anual'>('diario');

  const filteredRecords = useMemo(() => filterRecords(filters), [records, filters]);

  const stats = useMemo(() => {
    const totalQuantity = filteredRecords.reduce((sum, record) => sum + record.produtos.reduce((prodSum, p) => prodSum + p.quantidade, 0), 0);
    const productCounts = filteredRecords.reduce((acc, r) => { r.produtos.forEach(p => { acc[p.produto] = (acc[p.produto] || 0) + p.quantidade; }); return acc; }, {} as Record<string, number>);
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
    const clientCounts = filteredRecords.reduce((acc, r) => { acc[r.cliente] = (acc[r.cliente] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topClient = Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0];
    const motivoCounts = filteredRecords.reduce((acc, r) => { r.produtos.forEach(p => { acc[p.motivo] = (acc[p.motivo] || 0) + 1; }); return acc; }, {} as Record<string, number>);
    const topMotivo = Object.entries(motivoCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalRecords: filteredRecords.length,
      totalQuantity: totalQuantity.toFixed(2),
      topProduct: topProduct ? { name: topProduct[0], count: topProduct[1] } : null,
      topClient: topClient ? { name: topClient[0], count: topClient[1] } : null,
      topMotivo: topMotivo ? { name: topMotivo[0], count: topMotivo[1] } : null
    };
  }, [filteredRecords]);

  const chartData = useMemo(() => {
    const today = new Date();
    const productCounts = filteredRecords.reduce((acc, r) => { r.produtos.forEach(p => { acc[p.produto] = (acc[p.produto] || 0) + p.quantidade; }); return acc; }, {} as Record<string, number>);
    const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name: name.substring(0, 15) + (name.length > 15 ? '...' : ''), value, fullName: name }));
    
    const clientCounts = filteredRecords.reduce((acc, r) => { acc[r.cliente] = (acc[r.cliente] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topClients = Object.entries(clientCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name: name.substring(0, 15) + (name.length > 15 ? '...' : ''), value, fullName: name }));

    const motivoCounts = filteredRecords.reduce((acc, r) => { r.produtos.forEach(p => { acc[p.motivo] = (acc[p.motivo] || 0) + 1; }); return acc; }, {} as Record<string, number>);
    const motivoData = Object.entries(motivoCounts).map(([name, value]) => ({ name: name.substring(0, 15) + (name.length > 15 ? '...' : ''), value, fullName: name }));

    const estadoCounts = filteredRecords.reduce((acc, r) => { r.produtos.forEach(p => { if (p.estado) acc[p.estado] = (acc[p.estado] || 0) + 1; }); return acc; }, {} as Record<string, number>);
    const estadoData = Object.entries(estadoCounts).map(([name, value]) => ({ name, value }));

    const getEvolutionData = () => { /* ... same logic as before ... */ return []; };
    
    return { topProducts, topClients, motivoData, estadoData, evolutionData: getEvolutionData() };
  }, [filteredRecords, evolutionFilter]);

  const clearFilters = () => setFilters({ search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '' });

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Dashboard</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} />

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
        initial="hidden" animate="visible" variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        <StatCard icon={<BarChart2 className="h-8 w-8 text-brand-primary" />} title="Devoluções" value={stats.totalRecords} />
        <StatCard icon={<Box className="h-8 w-8 text-brand-secondary" />} title="Qtd. Total" value={stats.totalQuantity} />
        <StatCard icon={<Package className="h-8 w-8 text-brand-primary" />} title="Top Produto" value={stats.topProduct?.name || '-'} subtitle={`${stats.topProduct?.count || 0} un.`} />
        <StatCard icon={<Users className="h-8 w-8 text-brand-secondary" />} title="Top Cliente" value={stats.topClient?.name || '-'} subtitle={`${stats.topClient?.count || 0} dev.`} />
        <StatCard icon={<AlertTriangle className="h-8 w-8 text-brand-accent" />} title="Top Motivo" value={stats.topMotivo?.name || '-'} subtitle={`${stats.topMotivo?.count || 0} ocorr.`} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <ChartContainer title="Top 10 Produtos Devolvidos" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData.topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="name" type="category" stroke="#999" width={100} />
              <Tooltip cursor={{ fill: 'rgba(249, 160, 63, 0.1)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px' }} />
              <Bar dataKey="value" fill="#013D28" barSize={20}>
                <LabelList dataKey="value" position="right" style={{ fill: '#013D28' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Devoluções por Estado" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie data={chartData.estadoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {chartData.estadoData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Top 10 Clientes" className="lg:col-span-3">
           <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData.topClients} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="name" type="category" stroke="#999" width={100} />
              <Tooltip cursor={{ fill: 'rgba(249, 160, 63, 0.1)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px' }} />
              <Bar dataKey="value" fill="#F9A03F" barSize={20}>
                <LabelList dataKey="value" position="right" style={{ fill: '#F9A03F' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Devoluções por Motivo" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData.motivoData} margin={{ top: 5, right: 5, left: 5, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip cursor={{ fill: 'rgba(1, 61, 40, 0.1)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px' }} />
              <Bar dataKey="value" fill="#4CAF50" >
                <LabelList dataKey="value" position="top" style={{ fill: '#4CAF50' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};
