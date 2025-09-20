import React, { useState, useMemo } from 'react';
import { Share, Trash2, Image, ChevronDown } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { FilterState, DevolutionRecord } from '../types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const Historico: React.FC = () => {
  const { records, updateRecord, deleteRecord, filterRecords } = useDevolutions();
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: ''
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<string[] | null>(null);

  const filteredRecords = useMemo(() => filterRecords(filters), [records, filters]);

  const clearFilters = () => setFilters({ search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '' });

  const toggleStatus = (record: DevolutionRecord) => {
    const newStatus = record.status === 'pendente' ? 'em_analise' : 'pendente';
    updateRecord(record.id, { 
      status: newStatus,
      editHistory: [...record.editHistory, { usuario: 'usuario@gdm.com', data: new Date().toISOString(), alteracao: `Status: ${record.status} -> ${newStatus}` }]
    });
    toast.success(`Status alterado para ${newStatus === 'pendente' ? 'Pendente' : 'Em Análise'}`);
  };

  const getStatusBadge = (record: DevolutionRecord) => {
    const statusConfig = {
      pendente: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      em_analise: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Em Análise' },
      finalizado: { bg: 'bg-green-100', text: 'text-green-800', label: 'Finalizado' }
    };
    const config = statusConfig[record.status];
    return (
      <button onClick={() => toggleStatus(record)} disabled={record.status === 'finalizado'} className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} ${record.status !== 'finalizado' ? 'cursor-pointer hover:opacity-80' : ''} transition`}>
        {config.label}
      </button>
    );
  };

  const shareRecord = (record: DevolutionRecord) => { /* ... same logic ... */ };
  const deleteRecordWithConfirm = (id: string) => { if (window.confirm('Tem certeza?')) { deleteRecord(id); toast.success('Excluído!'); } };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Histórico de Devoluções</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} />

      <div className="bg-brand-surface rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-primary/5">
              <tr>
                {['Data', 'Cliente', 'Produtos', 'Status', 'Usuário', 'Ações'].map(h => (
                  <th key={h} className="px-6 py-4 text-left font-semibold text-brand-primary uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <React.Fragment key={record.id}>
                  <tr className="border-b border-gray-200/50 hover:bg-brand-secondary/5">
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(record.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-medium">{record.cliente}</td>
                    <td className="px-6 py-4">{record.produtos.length} produto(s)</td>
                    <td className="px-6 py-4">{getStatusBadge(record)}</td>
                    <td className="px-6 py-4 text-gray-600">{record.usuario}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button onClick={() => shareRecord(record)} className="text-gray-500 hover:text-brand-primary" title="Compartilhar"><Share className="h-4 w-4" /></button>
                        {record.anexos.length > 0 && <button onClick={() => setImageModal(record.anexos)} className="text-gray-500 hover:text-brand-primary" title="Ver Imagens"><Image className="h-4 w-4" /></button>}
                        <button onClick={() => deleteRecordWithConfirm(record.id)} className="text-gray-500 hover:text-red-500" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <button onClick={() => setExpandedRow(expandedRow === record.id ? null : record.id)}>
                        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${expandedRow === record.id ? 'rotate-180' : ''}`} />
                      </button>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedRow === record.id && (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={7} className="p-0">
                          <div className="bg-gray-50 p-6">
                            <h4 className="font-semibold text-brand-primary mb-4">Detalhes do Registro</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                              <div><strong>Motorista:</strong> {record.motorista}</div>
                              <div><strong>Observação:</strong> {record.observacao || 'N/A'}</div>
                              <div className="col-span-full">
                                <strong className="block mb-2">Produtos:</strong>
                                <ul className="space-y-2">
                                  {record.produtos.map((p, i) => <li key={i} className="p-2 bg-white rounded-md">{p.produto} ({p.quantidade} {p.tipo}) - Motivo: {p.motivo}</li>)}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && <div className="text-center py-12 text-gray-500">Nenhum registro encontrado.</div>}
        </div>
      </div>

      <AnimatePresence>
        {imageModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setImageModal(null)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {imageModal.map((url, i) => <img key={i} src={url} className="w-full h-auto rounded-md" />)}
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
