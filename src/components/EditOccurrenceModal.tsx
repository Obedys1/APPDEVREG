import React, { useState } from 'react';
import { OccurrenceRecord } from '../types';
import { motion } from 'framer-motion';
import { X, Save, Calendar, User, Truck, Repeat, Briefcase, AlertCircle, ClipboardCheck, FileText, Users, Building, MapPin, Globe } from 'lucide-react';
import { CLIENTES_DETALHADOS, MOTORISTAS, REINCIDENCIA, SETORES_RESPONSAVEIS, MOTIVOS_OCORRENCIA, IMPACTOS } from '../data/lists';
import { useOccurrences } from '../hooks/useOccurrences';
import toast from 'react-hot-toast';

interface EditOccurrenceModalProps {
    record: OccurrenceRecord;
    onClose: () => void;
}

export const EditOccurrenceModal: React.FC<EditOccurrenceModalProps> = ({ record, onClose }) => {
    const { updateOccurrence } = useOccurrences();
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        data: record.data.split('T')[0],
        cliente: record.cliente,
        vendedor: record.vendedor,
        rede: record.rede,
        cidade: record.cidade,
        uf: record.uf,
        motorista: MOTORISTAS.includes(record.motorista) ? record.motorista : 'Outro (digitar)',
        customMotorista: MOTORISTAS.includes(record.motorista) ? '' : record.motorista,
        reincidencia: record.reincidencia,
        setor_responsavel: SETORES_RESPONSAVEIS.includes(record.setor_responsavel) ? record.setor_responsavel : 'Outro (digitar)',
        customSetor: SETORES_RESPONSAVEIS.includes(record.setor_responsavel) ? '' : record.setor_responsavel,
        motivo_ocorrencia: MOTIVOS_OCORRENCIA.includes(record.motivo_ocorrencia) ? record.motivo_ocorrencia : 'Outro (digitar)',
        customMotivo: MOTIVOS_OCORRENCIA.includes(record.motivo_ocorrencia) ? '' : record.motivo_ocorrencia,
        impactos: IMPACTOS.includes(record.impactos) ? record.impactos : 'Outro (digitar)',
        customImpacto: IMPACTOS.includes(record.impactos) ? '' : record.impactos,
        resumo_ocorrencia: record.resumo_ocorrencia,
        tratativa: record.tratativa,
    });

    const updateFormDataState = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const toastId = toast.loading('Salvando alterações...');

        try {
            const finalData = {
                ...formData,
                motorista: formData.motorista === 'Outro (digitar)' ? formData.customMotorista : formData.motorista,
                setor_responsavel: formData.setor_responsavel === 'Outro (digitar)' ? formData.customSetor : formData.setor_responsavel,
                motivo_ocorrencia: formData.motivo_ocorrencia === 'Outro (digitar)' ? formData.customMotivo : formData.motivo_ocorrencia,
                impactos: formData.impactos === 'Outro (digitar)' ? formData.customImpacto : formData.impactos,
            };
            const { customMotorista, customSetor, customMotivo, customImpacto, ...dataToSave } = finalData;

            await updateOccurrence(record.id, dataToSave);

            toast.success('Ocorrência atualizada com sucesso!', { id: toastId });
            onClose();
        } catch (error: any) {
            toast.error(`Falha ao atualizar: ${error.message}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const commonInputClass = "w-full bg-brand-surface border border-gray-300/70 rounded-lg py-2 px-3 text-sm text-brand-text-base focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-brand-background rounded-2xl p-6 max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-brand-background py-2 z-10">
                    <h2 className="text-2xl font-bold text-brand-primary">Editar Ocorrência</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500"><X className="h-6 w-6" /></button>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-brand-surface rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Calendar className="h-4 w-4" /> Data</label><input type="date" value={formData.data} onChange={(e) => updateFormDataState('data', e.target.value)} className={commonInputClass} /></div>
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><User className="h-4 w-4" /> Cliente</label><select value={formData.cliente} onChange={(e) => updateFormDataState('cliente', e.target.value)} className={commonInputClass}><option value="">Selecionar cliente...</option>{CLIENTES_DETALHADOS.map(c => <option key={c.cliente} value={c.cliente}>{c.cliente}</option>)}</select></div>
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Truck className="h-4 w-4" /> Motorista</label><select value={formData.motorista} onChange={(e) => updateFormDataState('motorista', e.target.value)} className={commonInputClass}><option value="">Selecionar motorista...</option>{MOTORISTAS.map(m => <option key={m} value={m}>{m}</option>)}</select>{formData.motorista === 'Outro (digitar)' && <input type="text" value={formData.customMotorista} onChange={(e) => updateFormDataState('customMotorista', e.target.value)} className={`${commonInputClass} mt-2`} />}</div>
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Users className="h-4 w-4" /> Vendedor</label><input type="text" value={formData.vendedor} onChange={(e) => updateFormDataState('vendedor', e.target.value)} className={commonInputClass} /></div>
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Building className="h-4 w-4" /> Rede</label><input type="text" value={formData.rede} onChange={(e) => updateFormDataState('rede', e.target.value)} className={commonInputClass} /></div>
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><MapPin className="h-4 w-4" /> Cidade/UF</label><div className="flex gap-2"><input type="text" value={formData.cidade} onChange={(e) => updateFormDataState('cidade', e.target.value)} className={`${commonInputClass} flex-grow`} /><input type="text" value={formData.uf} onChange={(e) => updateFormDataState('uf', e.target.value)} className={`${commonInputClass} w-16`} /></div></div>
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Repeat className="h-4 w-4" /> Reincidência</label><select value={formData.reincidencia} onChange={(e) => updateFormDataState('reincidencia', e.target.value)} className={commonInputClass}>{REINCIDENCIA.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    </div>

                    <div className="bg-brand-surface rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Briefcase className="h-4 w-4" /> Setor Responsável</label><select value={formData.setor_responsavel} onChange={(e) => updateFormDataState('setor_responsavel', e.target.value)} className={commonInputClass}>{SETORES_RESPONSAVEIS.map(s => <option key={s} value={s}>{s}</option>)}</select>{formData.setor_responsavel === 'Outro (digitar)' && <input type="text" value={formData.customSetor} onChange={(e) => updateFormDataState('customSetor', e.target.value)} className={`${commonInputClass} mt-2`} />}</div>
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><AlertCircle className="h-4 w-4" /> Motivo Ocorrência</label><select value={formData.motivo_ocorrencia} onChange={(e) => updateFormDataState('motivo_ocorrencia', e.target.value)} className={commonInputClass}>{MOTIVOS_OCORRENCIA.map(m => <option key={m} value={m}>{m}</option>)}</select>{formData.motivo_ocorrencia === 'Outro (digitar)' && <input type="text" value={formData.customMotivo} onChange={(e) => updateFormDataState('customMotivo', e.target.value)} className={`${commonInputClass} mt-2`} />}</div>
                        <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><ClipboardCheck className="h-4 w-4" /> Impactos</label><select value={formData.impactos} onChange={(e) => updateFormDataState('impactos', e.target.value)} className={commonInputClass}>{IMPACTOS.map(i => <option key={i} value={i}>{i}</option>)}</select>{formData.impactos === 'Outro (digitar)' && <input type="text" value={formData.customImpacto} onChange={(e) => updateFormDataState('customImpacto', e.target.value)} className={`${commonInputClass} mt-2`} />}</div>
                        <div className="md:col-span-3"><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><FileText className="h-4 w-4" /> Resumo</label><textarea value={formData.resumo_ocorrencia} onChange={(e) => updateFormDataState('resumo_ocorrencia', e.target.value)} rows={3} className={commonInputClass} /></div>
                        <div className="md:col-span-3"><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><ClipboardCheck className="h-4 w-4" /> Tratativa</label><textarea value={formData.tratativa} onChange={(e) => updateFormDataState('tratativa', e.target.value)} rows={3} className={commonInputClass} /></div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 sticky bottom-0 bg-brand-background py-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-brand-secondary text-white rounded-lg hover:bg-opacity-90 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50">
                        <Save className="h-5 w-5" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
