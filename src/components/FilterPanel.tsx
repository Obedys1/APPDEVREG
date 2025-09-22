import React, { useState } from 'react';
import { FilterState } from '../types';
import { CLIENTES_DETALHADOS, MOTIVOS, ESTADOS, PRODUTOS, REINCIDENCIA, PERIODOS, FAMILIAS, GRUPOS, VENDEDORES, REDES, CIDADES, UFS, MOTIVOS_OCORRENCIA, SETORES_RESPONSAVEIS, IMPACTOS } from '../data/lists';
import { Search, Calendar, Filter, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  moduleType: 'devolucao' | 'ocorrencia' | 'dashboard';
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  moduleType
}) => {
  const [showMore, setShowMore] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const commonInputClass = "w-full bg-brand-surface border border-gray-300/50 rounded-lg py-2 px-3 text-sm text-brand-text-base focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition";
  const commonSelectClass = `${commonInputClass} appearance-none`;

  return (
    <div className="bg-brand-surface/50 rounded-2xl shadow-md p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, produto, motivo..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className={`${commonInputClass} pl-10`}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => updateFilter('startDate', e.target.value)}
            className={`${commonInputClass} pl-10`}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => updateFilter('endDate', e.target.value)}
            className={`${commonInputClass} pl-10`}
          />
        </div>
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-brand-primary font-medium hover:bg-brand-primary/10 rounded-lg transition-colors"
        >
          <Filter className="h-4 w-4" />
          <span>Mais Filtros</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={onClearFilters}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 font-medium hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
          Limpar
        </button>
      </div>
      
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4">
              <div className="relative">
                <select value={filters.period} onChange={(e) => updateFilter('period', e.target.value)} className={commonSelectClass}>
                  <option value="">🗓️ Período</option>
                  {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={filters.cliente} onChange={(e) => updateFilter('cliente', e.target.value)} className={commonSelectClass}>
                  <option value="">👤 Cliente</option>
                  {CLIENTES_DETALHADOS.map(c => <option key={c.cliente} value={c.cliente}>{c.cliente}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              {(moduleType === 'devolucao' || moduleType === 'dashboard') && (
                <>
                  <div className="relative">
                    <select value={filters.produto} onChange={(e) => updateFilter('produto', e.target.value)} className={commonSelectClass}>
                      <option value="">📦 Produto</option>
                      {PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={filters.motivo} onChange={(e) => updateFilter('motivo', e.target.value)} className={commonSelectClass}>
                      <option value="">⚠️ Motivo devolução</option>
                      {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={filters.estado} onChange={(e) => updateFilter('estado', e.target.value)} className={commonSelectClass}>
                      <option value="">♻️ Estado</option>
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={filters.familia} onChange={(e) => updateFilter('familia', e.target.value)} className={commonSelectClass}>
                      <option value="">👨‍👩‍👧 Família</option>
                      {FAMILIAS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={filters.grupo} onChange={(e) => updateFilter('grupo', e.target.value)} className={commonSelectClass}>
                      <option value="">📦 Grupo</option>
                      {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </>
              )}

              {(moduleType === 'ocorrencia' || moduleType === 'dashboard') && (
                 <>
                  <div className="relative">
                    <select value={filters.setor_responsavel} onChange={(e) => updateFilter('setor_responsavel', e.target.value)} className={commonSelectClass}>
                      <option value="">🏢 Setor Responsável</option>
                      {SETORES_RESPONSAVEIS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={filters.motivo_ocorrencia} onChange={(e) => updateFilter('motivo_ocorrencia', e.target.value)} className={commonSelectClass}>
                      <option value="">⚠️ Motivo ocorrência</option>
                      {MOTIVOS_OCORRENCIA.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={filters.impactos} onChange={(e) => updateFilter('impactos', e.target.value)} className={commonSelectClass}>
                      <option value="">💥 Impacto</option>
                      {IMPACTOS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </>
              )}

              <div className="relative">
                <select value={filters.reincidencia} onChange={(e) => updateFilter('reincidencia', e.target.value)} className={commonSelectClass}>
                  <option value="">🔄 Reincidência</option>
                  {REINCIDENCIA.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={filters.vendedor} onChange={(e) => updateFilter('vendedor', e.target.value)} className={commonSelectClass}>
                  <option value="">🤵 Vendedor</option>
                  {VENDEDORES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={filters.rede} onChange={(e) => updateFilter('rede', e.target.value)} className={commonSelectClass}>
                  <option value="">🏢 Rede</option>
                  {REDES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={filters.cidade} onChange={(e) => updateFilter('cidade', e.target.value)} className={commonSelectClass}>
                  <option value="">🏙️ Cidade</option>
                  {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={filters.uf} onChange={(e) => updateFilter('uf', e.target.value)} className={commonSelectClass}>
                  <option value="">🗺️ UF</option>
                  {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
