import React, { useState, useMemo } from 'react';
import { Share, Trash2, AlertCircle, ClipboardList, PackageX, FilePenLine } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useOccurrences } from '../hooks/useOccurrences';
import { FilterState, OccurrenceRecord } from '../types';
import toast from 'react-hot-toast';

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

export const HistoricoOcorrencias: React.FC = () => {
  const { occurrences, filterOccurrences } = useOccurrences();
  const [filters, setFilters] = useState<FilterState>({
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

  const filteredOccurrences = useMemo(() => filterOccurrences(filters), [occurrences, filters, filterOccurrences]);

  const stats = useMemo(() => {
    return {
        totalOcorrencias: filteredOccurrences.length,
    };
  }, [filteredOccurrences]);

  const clearFilters = () => setFilters({ 
    search: '', startDate: '', endDate: '', period: '', motivo: '', estado: '', produto: '', cliente: '', reincidencia: '',
    familia: '', grupo: '', vendedor: '', rede: '', cidade: '', uf: ''
  });

  const generateWhatsAppMessage = (record: OccurrenceRecord) => {
    const EMOJI = {
        WARNING: String.fromCodePoint(0x26A0), DATE: String.fromCodePoint(0x1F4C5),
        USER: String.fromCodePoint(0x1F464), TRUCK: String.fromCodePoint(0x1F69A),
        BUILDING: String.fromCodePoint(0x1F3E2), CITY: String.fromCodePoint(0x1F3D9),
        REPEAT: String.fromCodePoint(0x1F501), BRIEFCASE: String.fromCodePoint(0x1F4BC),
        CLIPBOARD: String.fromCodePoint(0x1F4CB), IMPACT: String.fromCodePoint(0x1F4A5),
        NOTE: String.fromCodePoint(0x1F4DD), PIN: String.fromCodePoint(0x1F4CC),
    };

    let message = `${EMOJI.WARNING} *REGISTRO DE OCORRÊNCIA* ${EMOJI.WARNING}\n\n`;
    message += `*${EMOJI.DATE} Data:* ${new Date(record.data).toLocaleDateString('pt-BR')}\n`;
    message += `*${EMOJI.USER} Cliente:* ${record.cliente}\n`;
    message += `*${EMOJI.TRUCK} Motorista:* ${record.motorista}\n`;
    message += `*${EMOJI.USER} Vendedor:* ${record.vendedor}\n`;
    message += `*${EMOJI.BUILDING} Rede:* ${record.rede}\n`;
    message += `*${EMOJI.CITY} Cidade/UF:* ${record.cidade}/${record.uf}\n`;
    message += `*${EMOJI.REPEAT} Reincidência:* ${record.reincidencia}\n\n`;
    message += `*--- Detalhes da Ocorrência ---*\n`;
    message += `*${EMOJI.BRIEFCASE} Setor Responsável:* ${record.setor_responsavel}\n`;
    message += `*${EMOJI.CLIPBOARD} Motivo:* ${record.motivo_ocorrencia}\n`;
    message += `*${EMOJI.IMPACT} Impactos:* ${record.impactos}\n\n`;
    message += `*${EMOJI.NOTE} Resumo da Ocorrência:*\n_${record.resumo_ocorrencia}_\n\n`;
    message += `*${EMOJI.NOTE} Tratativa Aplicada:*\n_${record.tratativa}_\n\n`;
    message += `*${EMOJI.PIN} Registrado por:* ${record.usuario}\n`;

    return message;
  };

  const shareRecord = (record: OccurrenceRecord) => { 
    const message = generateWhatsAppMessage(record);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp para compartilhar!');
  };

  const tableHeaders = ['Data', 'Cliente', 'Cidade', 'Vendedor', 'Motorista', 'Setor', 'Motivo', 'Impactos', 'Usuário', 'Ações'];

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Histórico de ocorrências</h1>
      <FilterPanel filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} moduleType="ocorrencia" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard icon={<ClipboardList className="h-6 w-6" />} title="Total de Ocorrências" value={stats.totalOcorrencias} />
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
              {filteredOccurrences.map((record) => (
                  <tr key={record.id} className="hover:bg-brand-secondary/5">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(record.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 font-medium">{record.cliente}</td>
                    <td className="px-4 py-3">{record.cidade}</td>
                    <td className="px-4 py-3">{record.vendedor}</td>
                    <td className="px-4 py-3">{record.motorista}</td>
                    <td className="px-4 py-3">{record.setor_responsavel}</td>
                    <td className="px-4 py-3">{record.motivo_ocorrencia}</td>
                    <td className="px-4 py-3">{record.impactos}</td>
                    <td className="px-4 py-3">{record.usuario}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => shareRecord(record)} className="text-gray-500 hover:text-brand-primary" title="Compartilhar"><Share className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {filteredOccurrences.length === 0 && <div className="text-center py-12 text-gray-500">Nenhuma ocorrência encontrada com os filtros aplicados.</div>}
        </div>
      </div>
    </div>
  );
};
