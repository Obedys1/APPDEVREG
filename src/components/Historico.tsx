import React, { useState, useMemo } from 'react';
import { Share, Trash2, Image } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { FilterState, DevolutionRecord, ProductRecord } from '../types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface FlatRecord extends ProductRecord {
  parentRecord: DevolutionRecord;
}

export const Historico: React.FC = () => {
  const { records, updateRecord, deleteRecord, filterRecords } = useDevolutions();
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });
  const [imageModal, setImageModal] = useState<string[] | null>(null);

  const filteredRecords = useMemo(() => filterRecords(filters), [records, filters, filterRecords]);

  const flattenedRecords: FlatRecord[] = useMemo(() => {
    return filteredRecords.flatMap(record => 
      record.produtos.map(produto => ({
        ...produto,
        parentRecord: record
      }))
    );
  }, [filteredRecords]);

  const clearFilters = () => setFilters({ 
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

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

  const shareRecord = (record: DevolutionRecord) => { 
    const text = `Registro de Devolução:\nCliente: ${record.cliente}\nData: ${new Date(record.date).toLocaleDateString()}`;
    navigator.clipboard.writeText(text);
    toast.success('Informações copiadas para compartilhar!');
  };
  
  const deleteRecordWithConfirm = (id: string) => { 
    if (window.confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) { 
      deleteRecord(id); 
      toast.success('Registro excluído com sucesso!'); 
    } 
  };

  const tableHeaders = ['Data', 'Cliente', 'Motorista', 'Produto', 'Qtd', 'Motivo', 'Estado', 'Reincidência', 'Status', 'Ações'];

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Histórico de Devoluções</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} />

      <div className="bg-brand-surface rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-primary/5">
              <tr>
                {tableHeaders.map(h => (
                  <th key={h} className="px-4 py-4 text-left font-semibold text-brand-primary uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {flattenedRecords.map((flatRecord, index) => (
                <tr key={`${flatRecord.parentRecord.id}-${index}`} className="hover:bg-brand-secondary/5">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(flatRecord.parentRecord.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 font-medium">{flatRecord.parentRecord.cliente}</td>
                  <td className="px-4 py-3">{flatRecord.parentRecord.motorista}</td>
                  <td className="px-4 py-3">{flatRecord.produto}</td>
                  <td className="px-4 py-3">{flatRecord.quantidade}</td>
                  <td className="px-4 py-3">{flatRecord.motivo}</td>
                  <td className="px-4 py-3">{flatRecord.estado || '-'}</td>
                  <td className="px-4 py-3">{flatRecord.reincidencia}</td>
                  <td className="px-4 py-3">{getStatusBadge(flatRecord.parentRecord)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => shareRecord(flatRecord.parentRecord)} className="text-gray-500 hover:text-brand-primary" title="Compartilhar"><Share className="h-4 w-4" /></button>
                      {flatRecord.parentRecord.anexos.length > 0 && <button onClick={() => setImageModal(flatRecord.parentRecord.anexos)} className="text-gray-500 hover:text-brand-primary" title="Ver Imagens"><Image className="h-4 w-4" /></button>}
                      <button onClick={() => deleteRecordWithConfirm(flatRecord.parentRecord.id)} className="text-gray-500 hover:text-red-500" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {flattenedRecords.length === 0 && <div className="text-center py-12 text-gray-500">Nenhum registro encontrado com os filtros aplicados.</div>}
        </div>
      </div>

      <AnimatePresence>
        {imageModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setImageModal(null)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {imageModal.map((url, i) => <img key={i} src={url} alt={`Anexo ${i+1}`} className="w-full h-auto rounded-md" />)}
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
