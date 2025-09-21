import React, { useState } from 'react';
import { DevolutionRecord, ProductRecord } from '../types';
import { motion } from 'framer-motion';
import { X, Save, Calendar, User, Truck, Package, Scale, AlertTriangle, FileText, Camera, Upload, XCircle, Hash, Box, Users, MapPin, Building } from 'lucide-react';
import { CLIENTES_DETALHADOS, MOTORISTAS, PRODUTOS_DETALHADOS, FAMILIAS, TIPOS, MOTIVOS, ESTADOS, REINCIDENCIA } from '../data/lists';
import { useDevolutions } from '../hooks/useDevolutions';
import toast from 'react-hot-toast';

interface EditRecordModalProps {
    record: DevolutionRecord;
    onClose: () => void;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({ record, onClose }) => {
    const { updateRecord } = useDevolutions();
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        date: record.date.split('T')[0],
        cliente: record.cliente,
        vendedor: record.vendedor,
        rede: record.rede,
        cidade: record.cidade,
        uf: record.uf,
        motorista: MOTORISTAS.includes(record.motorista) ? record.motorista : 'Outro (digitar)',
        customMotorista: MOTORISTAS.includes(record.motorista) ? '' : record.motorista,
        observacao: record.observacao,
    });

    const [produtos, setProdutos] = useState<ProductRecord[]>(record.produtos);
    const [anexos, setAnexos] = useState<(string | File)[]>(record.anexos);

    const updateFormDataState = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateProduto = (index: number, field: keyof ProductRecord, value: string | number) => {
        setProdutos(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    };

    const addProduto = () => {
        setProdutos(prev => [...prev, { codigo: '', produto: '', familia: '', grupo: '', quantidade: 0, tipo: 'Cx', motivo: '', estado: '', reincidencia: '' }]);
    };

    const removeProduto = (index: number) => {
        if (produtos.length > 1) {
            setProdutos(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setAnexos(prev => [...prev, ...files]);
    };

    const removeAnexo = (index: number) => {
        setAnexos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const toastId = toast.loading('Salvando alterações...');

        try {
            const motoristaFinal = formData.motorista === 'Outro (digitar)' ? formData.customMotorista : formData.motorista;

            await updateRecord(record.id, {
                ...formData,
                motorista: motoristaFinal,
                produtos: produtos,
                anexos: anexos,
            });

            toast.success('Registro atualizado com sucesso!', { id: toastId });
            onClose();
        } catch (error: any) {
            toast.error(`Falha ao atualizar: ${error.message}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const commonInputClass = "w-full bg-brand-surface border border-gray-300/70 rounded-lg py-2 px-3 text-sm text-brand-text-base focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition";
    const readOnlyInputClass = "w-full bg-gray-100 border border-gray-300/70 rounded-lg py-2 px-3 text-sm text-gray-500 transition";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-brand-background rounded-2xl p-6 max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-brand-background py-2 z-10">
                    <h2 className="text-2xl font-bold text-brand-primary">Editar Registro</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500"><X className="h-6 w-6" /></button>
                </div>
                
                <div className="space-y-8">
                    {/* General Info */}
                    <div className="bg-brand-surface rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-brand-primary mb-4">Informações Gerais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Calendar className="h-4 w-4" /> Data *</label>
                                <input type="date" value={formData.date} onChange={(e) => updateFormDataState('date', e.target.value)} className={commonInputClass} required />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><User className="h-4 w-4" /> Cliente *</label>
                                <select value={formData.cliente} onChange={(e) => updateFormDataState('cliente', e.target.value)} className={commonInputClass} required>
                                    <option value="">Selecionar cliente...</option>
                                    {CLIENTES_DETALHADOS.map(c => <option key={c.cliente} value={c.cliente}>{c.cliente}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Truck className="h-4 w-4" /> Motorista *</label>
                                <select value={formData.motorista} onChange={(e) => updateFormDataState('motorista', e.target.value)} className={commonInputClass} required>
                                    <option value="">Selecionar motorista...</option>
                                    {MOTORISTAS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                {formData.motorista === 'Outro (digitar)' && (
                                    <input type="text" placeholder="Nome do motorista" value={formData.customMotorista} onChange={(e) => updateFormDataState('customMotorista', e.target.value)} className={`${commonInputClass} mt-2`} required />
                                )}
                            </div>
                            {/* Editable fields */}
                            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Users className="h-4 w-4" /> Vendedor</label><input type="text" value={formData.vendedor} onChange={e => updateFormDataState('vendedor', e.target.value)} className={commonInputClass} /></div>
                            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Building className="h-4 w-4" /> Rede</label><input type="text" value={formData.rede} onChange={e => updateFormDataState('rede', e.target.value)} className={commonInputClass} /></div>
                            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><MapPin className="h-4 w-4" /> Cidade / UF</label><div className="flex gap-2"><input type="text" value={formData.cidade} onChange={e => updateFormDataState('cidade', e.target.value)} className={`${commonInputClass} flex-grow`} /><input type="text" value={formData.uf} onChange={e => updateFormDataState('uf', e.target.value)} className={`${commonInputClass} w-16`} /></div></div>
                        </div>
                    </div>

                    {/* Products */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-brand-primary">Produtos Devolvidos</h3>
                        {produtos.map((produto, index) => (
                            <div key={produto.id || index} className="bg-brand-surface rounded-xl p-4 relative">
                                {produtos.length > 1 && <button type="button" onClick={() => removeProduto(index)} className="absolute -top-2 -right-2 text-red-500 hover:text-red-700"><XCircle className="h-6 w-6" fill="white" /></button>}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><label className="text-xs font-medium text-brand-text-muted">Produto</label><input type="text" value={produto.produto} onChange={e => updateProduto(index, 'produto', e.target.value)} className={commonInputClass} /></div>
                                    <div><label className="text-xs font-medium text-brand-text-muted">Quantidade</label><input type="number" value={produto.quantidade} onChange={e => updateProduto(index, 'quantidade', Number(e.target.value))} className={commonInputClass} /></div>
                                    <div><label className="text-xs font-medium text-brand-text-muted">Tipo</label><select value={produto.tipo} onChange={e => updateProduto(index, 'tipo', e.target.value)} className={commonInputClass}>{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                    <div><label className="text-xs font-medium text-brand-text-muted">Motivo</label><select value={produto.motivo} onChange={e => updateProduto(index, 'motivo', e.target.value)} className={commonInputClass}>{MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                                    <div><label className="text-xs font-medium text-brand-text-muted">Estado</label><select value={produto.estado} onChange={e => updateProduto(index, 'estado', e.target.value)} className={commonInputClass}>{ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                                    <div><label className="text-xs font-medium text-brand-text-muted">Reincidência</label><select value={produto.reincidencia} onChange={e => updateProduto(index, 'reincidencia', e.target.value)} className={commonInputClass}>{REINCIDENCIA.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addProduto} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">+ Adicionar Produto</button>
                    </div>

                    {/* Observation and Attachments */}
                    <div className="bg-brand-surface rounded-xl p-6 space-y-4">
                         <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><FileText className="h-4 w-4" /> Observação</label><textarea value={formData.observacao} onChange={(e) => updateFormDataState('observacao', e.target.value)} rows={3} className={commonInputClass} /></div>
                         <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2">📷 Evidências</label>
                            <label className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-opacity-90 transition-all cursor-pointer w-fit">
                                <Upload className="h-4 w-4" /> Anexar Novos Arquivos
                                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                                {anexos.map((anexo, index) => (
                                    <div key={index} className="relative">
                                        <img src={anexo instanceof File ? URL.createObjectURL(anexo) : anexo} alt={`Anexo ${index + 1}`} className="w-full h-24 object-cover rounded-lg shadow-md" />
                                        <button type="button" onClick={() => removeAnexo(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><XCircle className="h-5 w-5" /></button>
                                    </div>
                                ))}
                            </div>
                         </div>
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
