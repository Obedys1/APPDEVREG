import React, { useState } from 'react';
import { Calendar, User, Truck, Package, Scale, AlertTriangle, FileText, Camera, Upload, Save, XCircle, Hash, Box, Users, MapPin, Globe, Building } from 'lucide-react';
import { CLIENTES_DETALHADOS, MOTORISTAS, PRODUTOS_DETALHADOS, FAMILIAS, TIPOS, MOTIVOS, ESTADOS, REINCIDENCIA } from '../data/lists';
import { DevolutionRecord, ProductRecord } from '../types';
import { useDevolutions } from '../hooks/useDevolutions';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const Registros: React.FC = () => {
    const { saveRecord } = useDevolutions();
    const { user } = useAuth();
    const [showAddProductDialog, setShowAddProductDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const initialFormState = {
      data: new Date().toISOString().split('T')[0],
      cliente: '',
      vendedor: '',
      rede: '',
      cidade: '',
      uf: '',
      motorista: '',
      customMotorista: '',
      observacao: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    const initialProductState: ProductRecord = {
      codigo: '',
      produto: '',
      familia: '',
      grupo: '',
      quantidade: 0,
      tipo: 'Cx',
      motivo: '',
      estado: '',
      reincidencia: ''
    };
  
    const [produtos, setProdutos] = useState<ProductRecord[]>([initialProductState]);
  
    const [customValues, setCustomValues] = useState<Record<number, {
      tipo?: string;
      motivo?: string;
      estado?: string;
    }>>({});
  
    const [anexos, setAnexos] = useState<File[]>([]);
  
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
          cliente: '',
          vendedor: '',
          rede: '',
          cidade: '',
          uf: '',
        }));
      }
    };

    const updateFormData = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };
  
    const updateProduto = (index: number, field: keyof ProductRecord, value: string | number) => {
      setProdutos(prev => prev.map((produto, i) => 
        i === index ? { ...produto, [field]: value } : produto
      ));
    };

    const handleCodigoChange = (index: number, codigo: string) => {
      const updatedProdutos = [...produtos];
      const productData = PRODUTOS_DETALHADOS.find(p => p.codigo === codigo);
      
      updatedProdutos[index].codigo = codigo;

      if (productData) {
        updatedProdutos[index].produto = productData.produto;
        updatedProdutos[index].familia = productData.familia;
        updatedProdutos[index].grupo = productData.grupo;
      } else {
        updatedProdutos[index].produto = '';
        updatedProdutos[index].familia = '';
        updatedProdutos[index].grupo = '';
      }
      setProdutos(updatedProdutos);
    };
  
    const updateCustomValue = (index: number, field: string, value: string) => {
      setCustomValues(prev => ({
        ...prev,
        [index]: { ...prev[index], [field]: value }
      }));
    };
  
    const addProduto = () => {
      setProdutos(prev => [...prev, initialProductState]);
      setShowAddProductDialog(false);
    };
  
    const removeProduto = (index: number) => {
      if (produtos.length > 1) {
        setProdutos(prev => prev.filter((_, i) => i !== index));
        setCustomValues(prev => {
          const newCustomValues = { ...prev };
          delete newCustomValues[index];
          return newCustomValues;
        });
      }
    };
  
    const handleReincidenciaChange = (index: number, value: string) => {
      updateProduto(index, 'reincidencia', value);
      
      if (index === produtos.length - 1 && value && !showAddProductDialog) {
        setShowAddProductDialog(true);
      }
    };
  
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      setAnexos(prev => [...prev, ...files]);
    };
  
    const handleCameraCapture = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        setAnexos(prev => [...prev, ...files]);
      };
      input.click();
    };
  
    const removeAnexo = (index: number) => {
      setAnexos(prev => prev.filter((_, i) => i !== index));
    };
  
    const generateWhatsAppMessage = (record: DevolutionRecord) => {
      const EMOJI = {
        LOOP: String.fromCodePoint(0x1F504),
        DATE: String.fromCodePoint(0x1F4C5),
        LOCATION: String.fromCodePoint(0x1F4CD),
        USER: String.fromCodePoint(0x1F464),
        BUILDING: String.fromCodePoint(0x1F3E2),
        CITY: String.fromCodePoint(0x1F3D9),
        TRUCK: String.fromCodePoint(0x1F69A),
        PACKAGE: String.fromCodePoint(0x1F4E6),
        TAG: String.fromCodePoint(0x1F3F7),
        FAMILY: String.fromCodePoint(0x1F46A),
        RULER: String.fromCodePoint(0x1F4CF),
        WARNING: String.fromCodePoint(0x26A0),
        RECYCLE: String.fromCodePoint(0x267B),
        NOTE: String.fromCodePoint(0x1F4DD),
        CAMERA: String.fromCodePoint(0x1F4F7),
        PIN: String.fromCodePoint(0x1F4CC),
        SEARCH: String.fromCodePoint(0x1F50D),
      };

      let message = `${EMOJI.LOOP} *REGISTRO DE DEVOLUÇÃO* ${EMOJI.LOOP}\n\n`;
      message += `*${EMOJI.DATE} Data:* ${new Date(record.date).toLocaleDateString('pt-BR')}\n`;
      message += `*${EMOJI.LOCATION} Cliente:* ${record.cliente}\n`;
      message += `*${EMOJI.USER} Vendedor:* ${record.vendedor}\n`;
      message += `*${EMOJI.BUILDING} Rede:* ${record.rede}\n`;
      message += `*${EMOJI.CITY} Cidade:* ${record.cidade} - ${record.uf}\n`;
      message += `*${EMOJI.TRUCK} Motorista:* ${record.motorista}\n`;
      message += `*${EMOJI.USER} Registrado por:* ${record.usuario}\n\n`;
  
      record.produtos.forEach((produto, index) => {
        message += `*${EMOJI.PACKAGE} PRODUTO ${index + 1}*\n`;
        if (produto.codigo) message += `*# Código:* ${produto.codigo}\n`;
        message += `*${EMOJI.TAG} Produto:* ${produto.produto}\n`;
        message += `*${EMOJI.FAMILY} Família:* ${produto.familia}\n`;
        message += `*${EMOJI.PACKAGE} Grupo:* ${produto.grupo}\n`;
        message += `*${EMOJI.RULER} Quantidade:* ${produto.quantidade} ${produto.tipo}\n`;
        message += `*${EMOJI.WARNING} Motivo:* ${produto.motivo}\n`;
        if (produto.estado) message += `*${EMOJI.RECYCLE} Estado:* ${produto.estado}\n`;
        message += `*${EMOJI.LOOP} Reincidência:* ${produto.reincidencia}\n\n`;
      });
  
      if (record.observacao) {
        message += `*${EMOJI.NOTE} Observação:*\n_${record.observacao}_\n\n`;
      }
  
      if (record.anexos.length > 0) {
        message += `*${EMOJI.CAMERA} Evidências Anexadas:*\n`;
        record.anexos.forEach((url, index) => {
          message += `Anexo ${index + 1}: ${url}\n`;
        });
        message += '\n';
      }
  
      message += `*${EMOJI.PIN} Status:* ${EMOJI.SEARCH} Em análise\n`;
      return message;
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
  
      if (!formData.cliente || (!formData.motorista && !formData.customMotorista)) {
        toast.error('Cliente e Motorista são obrigatórios');
        setIsSaving(false);
        return;
      }
  
      for (const produto of produtos) {
        if (!produto.familia || !produto.quantidade || !produto.tipo || !produto.motivo || !produto.reincidencia) {
          toast.error('Para cada produto, os campos Família, Quantidade, Tipo, Motivo e Reincidência são obrigatórios.');
          setIsSaving(false);
          return;
        }
      }
  
      try {
        const processedProdutos = produtos.map((produto, index) => ({
          ...produto,
          tipo: produto.tipo === 'Outro (digitar)' ? customValues[index]?.tipo || '' : produto.tipo,
          motivo: produto.motivo === 'Outro (digitar)' ? customValues[index]?.motivo || '' : produto.motivo,
          estado: produto.estado === 'Outro (digitar)' ? customValues[index]?.estado || '' : produto.estado,
        }));
    
        const recordForSaving = {
          date: new Date(formData.data).toISOString(),
          cliente: formData.cliente,
          vendedor: formData.vendedor,
          rede: formData.rede,
          cidade: formData.cidade,
          uf: formData.uf,
          motorista: formData.motorista === 'Outro (digitar)' ? formData.customMotorista : formData.motorista,
          produtos: processedProdutos,
          observacao: formData.observacao,
          anexos: anexos,
        };
  
        const savedRecord = await saveRecord(recordForSaving);
        
        const message = generateWhatsAppMessage(savedRecord);
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    
        setFormData(initialFormState);
        setProdutos([initialProductState]);
        setCustomValues({});
        setAnexos([]);
    
        toast.success('Registro salvo com sucesso!');

      } catch (error: any) {
        console.error("Error saving record:", error);
        toast.error(`Falha ao salvar: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    };

  const commonInputClass = "w-full bg-brand-surface border border-gray-300/70 rounded-lg py-2 px-3 text-sm text-brand-text-base focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition";
  const readOnlyInputClass = "w-full bg-gray-100 border border-gray-300/70 rounded-lg py-2 px-3 text-sm text-gray-500 transition";

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-brand-primary">Registrar Devolução</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-brand-surface rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-brand-primary mb-6">Informações Gerais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2">
                <Calendar className="h-4 w-4" /> Data *
              </label>
              <input type="date" value={formData.data} onChange={(e) => updateFormData('data', e.target.value)} className={commonInputClass} required />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2">
                <User className="h-4 w-4" /> Cliente *
              </label>
              <select value={formData.cliente} onChange={(e) => handleClienteChange(e.target.value)} className={commonInputClass} required>
                <option value="">Selecionar cliente...</option>
                {CLIENTES_DETALHADOS.map(c => <option key={c.cliente} value={c.cliente}>{c.cliente}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2">
                <Truck className="h-4 w-4" /> Motorista *
              </label>
              <select value={formData.motorista} onChange={(e) => updateFormData('motorista', e.target.value)} className={commonInputClass} required>
                <option value="">Selecionar motorista...</option>
                {MOTORISTAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {formData.motorista === 'Outro (digitar)' && (
                <input type="text" placeholder="Nome do motorista" value={formData.customMotorista} onChange={(e) => updateFormData('customMotorista', e.target.value)} className={`${commonInputClass} mt-2`} required />
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2">
                <Users className="h-4 w-4" /> Vendedor
              </label>
              <input type="text" value={formData.vendedor} onChange={(e) => updateFormData('vendedor', e.target.value)} className={commonInputClass} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2">
                <Building className="h-4 w-4" /> Rede
              </label>
              <input type="text" value={formData.rede} onChange={(e) => updateFormData('rede', e.target.value)} className={commonInputClass} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2">
                <MapPin className="h-4 w-4" /> Cidade / UF
              </label>
              <div className="flex gap-2">
                <input type="text" value={formData.cidade} onChange={(e) => updateFormData('cidade', e.target.value)} className={`${commonInputClass} flex-grow`} />
                <input type="text" value={formData.uf} onChange={(e) => updateFormData('uf', e.target.value)} className={`${commonInputClass} w-16`} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-brand-primary">Produtos Devolvidos</h2>
          {produtos.map((produto, index) => (
            <motion.div key={index} layout className="bg-brand-surface rounded-2xl shadow-lg p-6 relative">
              {produtos.length > 1 && (
                <button type="button" onClick={() => removeProduto(index)} className="absolute -top-2 -right-2 text-red-500 hover:text-red-700">
                  <XCircle className="h-6 w-6" fill="white" />
                </button>
              )}
              <h3 className="font-semibold text-brand-primary mb-4">Produto {index + 1}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Hash className="h-4 w-4" /> Código</label>
                  <input type="text" placeholder="Código do produto" value={produto.codigo} onChange={(e) => handleCodigoChange(index, e.target.value)} className={commonInputClass} />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Package className="h-4 w-4" /> Produto</label>
                  <input type="text" value={produto.produto} className={`${readOnlyInputClass}`} readOnly />
                </div>
                 <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Box className="h-4 w-4" /> Família *</label>
                  <select value={produto.familia} onChange={(e) => updateProduto(index, 'familia', e.target.value)} className={commonInputClass} required>
                    <option value="">Selecione a família...</option>
                    {FAMILIAS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Users className="h-4 w-4" /> Grupo</label>
                  <input type="text" value={produto.grupo} className={`${readOnlyInputClass}`} readOnly />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Scale className="h-4 w-4" /> Quantidade *</label>
                  <input type="number" placeholder="0" value={produto.quantidade} onChange={(e) => updateProduto(index, 'quantidade', Number(e.target.value))} className={commonInputClass} required min="0" step="0.01" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><Scale className="h-4 w-4" /> Tipo *</label>
                  <select value={produto.tipo} onChange={(e) => updateProduto(index, 'tipo', e.target.value)} className={commonInputClass} required>
                    <option value="">Selecione o tipo...</option>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {produto.tipo === 'Outro (digitar)' && <input type="text" placeholder="Tipo" value={customValues[index]?.tipo || ''} onChange={(e) => updateCustomValue(index, 'tipo', e.target.value)} className={`${commonInputClass} mt-2`} required />}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><AlertTriangle className="h-4 w-4" /> Motivo *</label>
                  <select value={produto.motivo} onChange={(e) => updateProduto(index, 'motivo', e.target.value)} className={commonInputClass} required>
                    <option value="">Selecione o motivo...</option>
                    {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {produto.motivo === 'Outro (digitar)' && <input type="text" placeholder="Motivo" value={customValues[index]?.motivo || ''} onChange={(e) => updateCustomValue(index, 'motivo', e.target.value)} className={`${commonInputClass} mt-2`} required />}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><AlertTriangle className="h-4 w-4" /> Estado</label>
                  <select value={produto.estado} onChange={(e) => updateProduto(index, 'estado', e.target.value)} className={commonInputClass}>
                    <option value="">Selecione o estado...</option>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {produto.estado === 'Outro (digitar)' && <input type="text" placeholder="Estado" value={customValues[index]?.estado || ''} onChange={(e) => updateCustomValue(index, 'estado', e.target.value)} className={`${commonInputClass} mt-2`} required />}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-1"><AlertTriangle className="h-4 w-4" /> Reincidência *</label>
                  <select value={produto.reincidencia} onChange={(e) => handleReincidenciaChange(index, e.target.value)} className={commonInputClass} required>
                    <option value="">Selecione...</option>
                    {REINCIDENCIA.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-brand-surface rounded-2xl shadow-lg p-8 space-y-6">
           <div>
            <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2"><FileText className="h-4 w-4" /> Observação</label>
            <textarea value={formData.observacao} onChange={(e) => updateFormData('observacao', e.target.value)} rows={3} className={commonInputClass} placeholder="Detalhes adicionais sobre a devolução..." />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-brand-text-muted mb-2">📷 Evidências</label>
            <div className="flex flex-wrap gap-4 mb-4">
              <button type="button" onClick={handleCameraCapture} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-all">
                <Camera className="h-4 w-4" /> Tirar Foto
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-opacity-90 transition-all cursor-pointer">
                <Upload className="h-4 w-4" /> Anexar Arquivos
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <AnimatePresence>
              {anexos.length > 0 && (
                <motion.div layout className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {anexos.map((file, index) => (
                    <motion.div key={index} layout initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="relative">
                      <img src={URL.createObjectURL(file)} alt={`Anexo ${index + 1}`} className="w-full h-24 object-cover rounded-lg shadow-md" />
                      <button type="button" onClick={() => removeAnexo(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                        <XCircle className="h-5 w-5" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-brand-secondary text-white rounded-lg hover:bg-opacity-90 transition-all font-bold text-lg shadow-lg disabled:opacity-50">
          <Save className="h-6 w-6" />
          {isSaving ? 'SALVANDO...' : 'SALVAR E ENVIAR REGISTRO'}
        </button>
      </form>

      <AnimatePresence>
        {showAddProductDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} exit={{ scale: 0.7 }} className="bg-brand-surface rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-semibold text-brand-primary mb-4">Adicionar mais produtos?</h3>
              <p className="text-brand-text-muted mb-8">Deseja incluir mais produtos neste mesmo registro antes de salvar?</p>
              <div className="flex gap-4">
                <button type="button" onClick={addProduto} className="flex-1 px-4 py-3 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-semibold">Sim, adicionar</button>
                <button type="button" onClick={() => setShowAddProductDialog(false)} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Não, continuar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
