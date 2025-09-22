import React, { useState } from 'react';
import { Calendar, User, Truck, FileText, Save, Users, Building, MapPin, Globe, Repeat, Briefcase, AlertCircle, ClipboardCheck } from 'lucide-react';
import { CLIENTES_DETALHADOS, MOTORISTAS, REINCIDENCIA, SETORES_RESPONSAVEIS, MOTIVOS_OCORRENCIA, IMPACTOS } from '../data/lists';
import { OccurrenceRecord } from '../types';
import { useOccurrences } from '../hooks/useOccurrences';
import toast from 'react-hot-toast';

const getSalvadorDateString = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

export const Ocorrencias: React.FC = () => {
    const { saveOccurrence } = useOccurrences();
    const [isSaving, setIsSaving] = useState(false);
    
    const initialFormState: Omit<OccurrenceRecord, 'id' | 'usuario_id' | 'created_at' | 'usuario'> = {
      data: getSalvadorDateString(),
      cliente: '',
      vendedor: '',
      rede: '',
      cidade: '',
      uf: '',
      motorista: '',
      reincidencia: '',
      setor_responsavel: '',
      motivo_ocorrencia: '',
      resumo_ocorrencia: '',
      tratativa: '',
      impactos: '',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [customMotorista, setCustomMotorista] = useState('');
    const [customSetor, setCustomSetor] = useState('');
    const [customMotivo, setCustomMotivo] = useState('');
    const [customImpacto, setCustomImpacto] = useState('');

    const handleClienteChange = (clienteNome: string) => {
      const clienteData = CLIENTES_DETALHADOS.find(c => c.cliente === clienteNome);
      if (clienteData) {
        setFormData(prev => ({
          ...prev,
          cliente: clienteData.cliente,
          vendedor: clienteData.vendedor,
          rede: clienteData.rede,
          cidade: clienteData.cidade,
          uf: clienteData.uf,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          cliente: clienteNome,
          vendedor: '',
          rede: '',
          cidade: '',
          uf: '',
        }));
      }
    };

    const updateFormData = (field: keyof typeof initialFormState, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    const generateWhatsAppMessage = (record: OccurrenceRecord) => {
        const EMOJI = {
            WARNING: String.fromCodePoint(0x26A0),
            DATE: String.fromCodePoint(0x1F4C5),
            USER: String.fromCodePoint(0x1F464),
            TRUCK: String.fromCodePoint(0x1F69A),
            BUILDING: String.fromCodePoint(0x1F3E2),
            CITY: String.fromCodePoint(0x1F3D9),
            REPEAT: String.fromCodePoint(0x1F501),
            BRIEFCASE: String.fromCodePoint(0x1F4BC),
            CLIPBOARD: String.fromCodePoint(0x1F4CB),
            IMPACT: String.fromCodePoint(0x1F4A5),
            NOTE: String.fromCodePoint(0x1F4DD),
            PIN: String.fromCodePoint(0x1F4CC),
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
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
  
      const requiredFields: (keyof typeof initialFormState)[] = ['data', 'cliente', 'motorista', 'reincidencia', 'setor_responsavel', 'motivo_ocorrencia', 'resumo_ocorrencia', 'tratativa', 'impactos'];
      for (const field of requiredFields) {
        if (!formData[field] || (formData[field] === 'Outro (digitar)')) {
          toast.error(`O campo "${field.replace(/_/g, ' ')}" é obrigatório.`);
          setIsSaving(false);
          return;
        }
      }
  
      try {
        const recordForSaving = {
            ...formData,
            motorista: formData.motorista === 'Outro (digitar)' ? customMotorista : formData.motorista,
            setor_responsavel: formData.setor_responsavel === 'Outro (digitar)' ? customSetor : formData.setor_responsavel,
            motivo_ocorrencia: formData.motivo_ocorrencia === 'Outro (digitar)' ? customMotivo : formData.motivo_ocorrencia,
            impactos: formData.impactos === 'Outro (digitar)' ? customImpacto : formData.impactos,
        };
  
        const savedRecord = await saveOccurrence(recordForSaving);
        
        const message = generateWhatsAppMessage(savedRecord);
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    
        setFormData(initialFormState);
        setCustomMotorista('');
        setCustomSetor('');
        setCustomMotivo('');
        setCustomImpacto('');
    
        toast.success('Ocorrência salva com sucesso!');

      } catch (error: any) {
        console.error("Error saving occurrence:", error);
        toast.error(`Falha ao salvar: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    };

  const commonInputClass = "w-full bg-brand-surface border border-gray-300/70 rounded-lg py-2 px-3 text-sm text-brand-text-base focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition";

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Registrar ocorrência</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-brand-surface rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-brand-primary mb-6">Informações da ocorrência</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><Calendar className="h-4 w-4" /> Data *</label><input type="date" value={formData.data} onChange={(e) => updateFormData('data', e.target.value)} className={commonInputClass} required /></div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><User className="h-4 w-4" /> Cliente *</label><select value={formData.cliente} onChange={(e) => handleClienteChange(e.target.value)} className={commonInputClass} required><option value="">Selecionar cliente...</option>{CLIENTES_DETALHADOS.map(c => <option key={c.cliente} value={c.cliente}>{c.cliente}</option>)}</select></div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><Truck className="h-4 w-4" /> Motorista *</label><select value={formData.motorista} onChange={(e) => updateFormData('motorista', e.target.value)} className={commonInputClass} required><option value="">Selecionar motorista...</option>{MOTORISTAS.map(m => <option key={m} value={m}>{m}</option>)}</select>{formData.motorista === 'Outro (digitar)' && (<input type="text" placeholder="Nome do motorista" value={customMotorista} onChange={(e) => setCustomMotorista(e.target.value)} className={`${commonInputClass} mt-2`} required />)}</div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><Users className="h-4 w-4" /> Vendedor</label><input type="text" value={formData.vendedor} onChange={(e) => updateFormData('vendedor', e.target.value)} className={commonInputClass} /></div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><Building className="h-4 w-4" /> Rede</label><input type="text" value={formData.rede} onChange={(e) => updateFormData('rede', e.target.value)} className={commonInputClass} /></div>
            <div className="flex gap-2"><div className="flex-grow"><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><MapPin className="h-4 w-4" /> Cidade</label><input type="text" value={formData.cidade} onChange={(e) => updateFormData('cidade', e.target.value)} className={commonInputClass} /></div><div className="w-20"><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><Globe className="h-4 w-4" /> UF</label><input type="text" value={formData.uf} onChange={(e) => updateFormData('uf', e.target.value)} className={commonInputClass} /></div></div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><Repeat className="h-4 w-4" /> Reincidência *</label><select value={formData.reincidencia} onChange={(e) => updateFormData('reincidencia', e.target.value)} className={commonInputClass} required><option value="">Selecione...</option>{REINCIDENCIA.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            
            <div className="md:col-span-2 lg:col-span-3 h-px bg-gray-200 my-4"></div>

            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><Briefcase className="h-4 w-4" /> Setor responsável *</label><select value={formData.setor_responsavel} onChange={(e) => updateFormData('setor_responsavel', e.target.value)} className={commonInputClass} required><option value="">Selecione o setor...</option>{SETORES_RESPONSAVEIS.map(s => <option key={s} value={s}>{s}</option>)}</select>{formData.setor_responsavel === 'Outro (digitar)' && (<input type="text" placeholder="Qual setor?" value={customSetor} onChange={(e) => setCustomSetor(e.target.value)} className={`${commonInputClass} mt-2`} required />)}</div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><AlertCircle className="h-4 w-4" /> Motivo da ocorrência *</label><select value={formData.motivo_ocorrencia} onChange={(e) => updateFormData('motivo_ocorrencia', e.target.value)} className={commonInputClass} required><option value="">Selecione o motivo...</option>{MOTIVOS_OCORRENCIA.map(m => <option key={m} value={m}>{m}</option>)}</select>{formData.motivo_ocorrencia === 'Outro (digitar)' && (<input type="text" placeholder="Qual motivo?" value={customMotivo} onChange={(e) => setCustomMotivo(e.target.value)} className={`${commonInputClass} mt-2`} required />)}</div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><ClipboardCheck className="h-4 w-4" /> Impactos *</label><select value={formData.impactos} onChange={(e) => updateFormData('impactos', e.target.value)} className={commonInputClass} required><option value="">Selecione o impacto...</option>{IMPACTOS.map(i => <option key={i} value={i}>{i}</option>)}</select>{formData.impactos === 'Outro (digitar)' && (<input type="text" placeholder="Qual impacto?" value={customImpacto} onChange={(e) => setCustomImpacto(e.target.value)} className={`${commonInputClass} mt-2`} required />)}</div>
            
            <div className="md:col-span-2 lg:col-span-3"><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><FileText className="h-4 w-4" /> Resumo da ocorrência *</label><textarea value={formData.resumo_ocorrencia} onChange={(e) => updateFormData('resumo_ocorrencia', e.target.value)} rows={4} className={commonInputClass} placeholder="Descreva o que aconteceu..." required /></div>
            <div className="md:col-span-2 lg:col-span-3"><label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><ClipboardCheck className="h-4 w-4" /> Tratativa *</label><textarea value={formData.tratativa} onChange={(e) => updateFormData('tratativa', e.target.value)} rows={4} className={commonInputClass} placeholder="Descreva a solução ou ação tomada..." required /></div>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-brand-secondary text-white rounded-lg hover:bg-opacity-90 transition-all font-bold text-lg shadow-lg disabled:opacity-50">
          <Save className="h-6 w-6" />
          {isSaving ? 'SALVANDO...' : 'SALVAR E COMPARTILHAR'}
        </button>
      </form>
    </div>
  );
};
