import React, { useState, useMemo } from 'react';
import { Share, Trash2, Image, X, ClipboardList, PackageX, AlertCircle, Lock } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useDevolutions } from '../hooks/useDevolutions';
import { useAuth } from '../contexts/AuthContext';
import { FilterState, DevolutionRecord, ProductRecord } from '../types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface FlatRecord extends ProductRecord {
  parentRecord: DevolutionRecord;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; }> = ({ icon, title, value }) => (
  <div className="bg-brand-surface rounded-2xl shadow-lg p-6 flex items-start gap-4">
    <div className="bg-brand-primary/10 p-3 rounded-lg text-brand-primary">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-brand-text-muted">{title}</p>
      <p className="text-2xl font-bold text-brand-primary">{value}</p>
    </div>
  </div>
);

const ImageItem: React.FC<{ url: string; index: number }> = ({ url, index }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !url) {
    return (
      <div className="group relative flex flex-col items-center justify-center w-full h-56 bg-gray-100 border border-red-200 rounded-lg text-center p-2">
        <AlertCircle className="text-red-500 mb-2 h-8 w-8" />
        <span className="text-sm text-red-600 font-semibold">Falha ao carregar</span>
        <span className="text-xs text-gray-500 truncate w-full px-1" title={url || 'URL inválida'}>
          URL inválida ou inacessível
        </span>
      </div>
    );
  }

  return (
    <a href={url} key={index} target="_blank" rel="noopener noreferrer" className="group relative block border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <img 
        src={url} 
        alt={`Anexo ${index + 1}`} 
        className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
        onError={() => setHasError(true)}
      />
    </a>
  );
};

export const Historico: React.FC = () => {
  const { records, updateRecord, deleteRecord, filterRecords } = useDevolutions();
  const { user } = useAuth();
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

  const stats = useMemo(() => {
    const totalQuantidade = flattenedRecords.reduce((sum, record) => sum + record.quantidade, 0);
    return {
        totalItens: flattenedRecords.length,
        totalQuantidade: totalQuantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  }, [flattenedRecords]);

  const clearFilters = () => setFilters({ 
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

  const toggleStatus = async (record: DevolutionRecord) => {
    const isOwner = user?.id === record.usuario_id;
    if (!isOwner) {
      toast.error('Você não tem permissão para alterar o status deste registro.');
      return;
    }
    if (record.status !== 'pendente' && record.status !== 'revisado') {
      toast.error('Apenas o status de registros "Pendentes" ou "Revisados" pode ser alterado.');
      return;
    }

    const newStatus = record.status === 'pendente' ? 'revisado' : 'pendente';
    const toastId = toast.loading('Alterando status...');

    try {
      await updateRecord(record.id, { status: newStatus });
      toast.success(`Status alterado para ${newStatus === 'revisado' ? 'Revisado' : 'Pendente'}`, { id: toastId });
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast.error(`Falha ao alterar status: ${error.message}`, { id: toastId });
    }
  };

  const getStatusBadge = (record: DevolutionRecord) => {
    const statusConfig = {
      pendente: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      em_analise: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Em Análise' },
      revisado: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Revisado' },
      finalizado: { bg: 'bg-green-100', text: 'text-green-800', label: 'Finalizado' }
    };
    const config = statusConfig[record.status];
    const isOwner = user?.id === record.usuario_id;
    const isClickable = isOwner && (record.status === 'pendente' || record.status === 'revisado');
    
    return (
      <button 
        onClick={() => toggleStatus(record)} 
        disabled={!isClickable} 
        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${config.bg} ${config.text} ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'} transition`}
        title={isOwner ? 'Clique para alterar' : 'Apenas o criador pode alterar'}
      >
        {config.label}
        {!isOwner && <Lock className="h-2.5 w-2.5" />}
      </button>
    );
  };

  const generateWhatsAppMessage = (record: DevolutionRecord, product: ProductRecord) => {
    let message = '🔄 *DETALHE DA DEVOLUÇÃO* 🔄\n\n';
    message += `*🆔 Registro ID:* ${record.id.substring(0, 8)}\n`;
    message += `*📅 Data:* ${new Date(record.date).toLocaleDateString('pt-BR')}\n`;
    message += `*👤 Cliente:* ${record.cliente}\n`;
    message += `*🚚 Motorista:* ${record.motorista}\n\n`;
    message += `*--- Item Devolvido ---*\n`;
    if (product.codigo) message += `*#️⃣ Código:* ${product.codigo}\n`;
    message += `*📦 Produto:* ${product.produto}\n`;
    message += `*🔢 Qtd:* ${product.quantidade} ${product.tipo}\n`;
    message += `*⚠️ Motivo:* ${product.motivo}\n`;
    message += `*♻️ Estado:* ${product.estado || 'N/A'}\n`;
    message += `*🔄 Reincidência:* ${product.reincidencia}\n\n`;
    if (record.observacao) {
      message += `*📝 Observação Geral:*\n_${record.observacao}_\n\n`;
    }
    message += `*📌 Status Atual:* ${record.status}\n`;
    return message;
  };

  const shareRecord = (flatRecord: FlatRecord) => { 
    const message = generateWhatsAppMessage(flatRecord.parentRecord, flatRecord);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp para compartilhar!');
  };
  
  const deleteRecordWithConfirm = async (id: string, isOwner: boolean) => {
    if (!isOwner) {
      toast.error('Você não tem permissão para excluir este registro.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
      const toastId = toast.loading('Excluindo registro...');
      try {
        await deleteRecord(id);
        toast.success('Registro excluído com sucesso!', { id: toastId });
      } catch (error: any) {
        console.error("Failed to delete record:", error);
        toast.error(`Falha ao excluir registro: ${error.message}`, { id: toastId });
      }
    }
  };

  const tableHeaders = ['Data', 'Cliente', 'Motorista', 'Produto', 'Qtd', 'Tipo', 'Motivo', 'Estado', 'Reincidência', 'Status', 'Ações'];

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Histórico de Devoluções</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard icon={<ClipboardList className="h-6 w-6" />} title="Qtd. de Itens Devolvidos" value={stats.totalItens} />
        <StatCard icon={<PackageX className="h-6 w-6" />} title="Qtd. Total Devolvida (un/kg)" value={stats.totalQuantidade} />
      </div>

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
              {flattenedRecords.map((flatRecord, index) => {
                const isOwner = user?.id === flatRecord.parentRecord.usuario_id;
                return (
                  <tr key={`${flatRecord.parentRecord.id}-${index}`} className="hover:bg-brand-secondary/5">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(flatRecord.parentRecord.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 font-medium">{flatRecord.parentRecord.cliente}</td>
                    <td className="px-4 py-3">{flatRecord.parentRecord.motorista}</td>
                    <td className="px-4 py-3">{flatRecord.produto}</td>
                    <td className="px-4 py-3">{flatRecord.quantidade}</td>
                    <td className="px-4 py-3">{flatRecord.tipo}</td>
                    <td className="px-4 py-3">{flatRecord.motivo}</td>
                    <td className="px-4 py-3">{flatRecord.estado || '-'}</td>
                    <td className="px-4 py-3">{flatRecord.reincidencia}</td>
                    <td className="px-4 py-3">{getStatusBadge(flatRecord.parentRecord)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => shareRecord(flatRecord)} className="text-gray-500 hover:text-brand-primary" title="Compartilhar"><Share className="h-4 w-4" /></button>
                        {flatRecord.parentRecord.anexos && flatRecord.parentRecord.anexos.length > 0 && <button onClick={() => setImageModal(flatRecord.parentRecord.anexos)} className="text-gray-500 hover:text-brand-primary" title="Ver Imagens"><Image className="h-4 w-4" /></button>}
                        <button 
                          onClick={() => deleteRecordWithConfirm(flatRecord.parentRecord.id, isOwner)} 
                          className={`text-gray-500 ${isOwner ? 'hover:text-red-500' : 'opacity-50 cursor-not-allowed'}`} 
                          title={isOwner ? 'Excluir' : 'Apenas o criador pode excluir'}
                          disabled={!isOwner}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {flattenedRecords.length === 0 && <div className="text-center py-12 text-gray-500">Nenhum registro encontrado com os filtros aplicados.</div>}
        </div>
      </div>

      <AnimatePresence>
        {imageModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setImageModal(null)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-brand-primary">Anexos do Registro</h3>
                        <button onClick={() => setImageModal(null)} className="text-gray-500 hover:text-red-500"><X className="h-6 w-6" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {imageModal.map((url, i) => (
                          <ImageItem url={url} index={i} key={`${url}-${i}`} />
                        ))}
                    </div>
                    {imageModal.length === 0 && <p className="text-center text-gray-500 py-8">Nenhuma imagem anexada a este registro.</p>}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
