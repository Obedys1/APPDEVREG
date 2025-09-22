import { useState, useCallback, useEffect } from 'react';
import { DevolutionRecord, FilterState, ProductRecord } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  parseISO, isWithinInterval, startOfDay, endOfDay, 
  startOfWeek, endOfWeek, subWeeks, 
  startOfMonth, endOfMonth, subMonths, 
  startOfQuarter, endOfQuarter, subQuarters, 
  startOfYear, endOfYear, subYears 
} from 'date-fns';

const sanitizeFileName = (fileName: string) => {
  return fileName
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid characters with underscore
    .replace(/\s+/g, '_'); // Replace spaces with underscore
};

export const useDevolutions = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DevolutionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    };
    setLoading(true);
    try {
      const { data: devolucoesData, error: devolucoesError } = await supabase
        .from('devolucoes')
        .select(`
          id,
          created_at,
          date,
          cliente,
          vendedor,
          rede,
          cidade,
          uf,
          motorista,
          observacao,
          status,
          anexos_urls,
          usuario_id,
          produtos_devolvidos (
            id,
            codigo,
            produto,
            familia,
            grupo,
            quantidade,
            tipo,
            motivo,
            estado,
            reincidencia
          )
        `)
        .order('created_at', { ascending: false });

      if (devolucoesError) throw devolucoesError;
      if (!devolucoesData) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(devolucoesData.map(d => d.usuario_id).filter(id => id))];
      let profilesMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError.message);
          toast.error(`Erro ao buscar emails dos usuários.`);
        } else if (profilesData) {
          profilesMap = new Map(profilesData.map(p => [p.id, p.email]));
        }
      }

      const formattedData = devolucoesData.map((d: any) => ({
        ...d,
        date: d.date,
        produtos: d.produtos_devolvidos || [],
        anexos: d.anexos_urls || [],
        usuario: profilesMap.get(d.usuario_id) || d.usuario_id,
        editHistory: [],
      })) as DevolutionRecord[];

      setRecords(formattedData);
    } catch (error: any) {
      console.error("Error fetching records:", error);
      toast.error(`Erro ao buscar registros: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const saveRecord = async (record: Omit<DevolutionRecord, 'id' | 'usuario' | 'editHistory' | 'anexos' | 'created_at' | 'usuario_id'> & { anexos: File[] }): Promise<DevolutionRecord> => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    const anexoUrls: string[] = [];
    for (const file of record.anexos) {
      const sanitizedFileName = sanitizeFileName(file.name);
      const filePath = `${user.id}/${Date.now()}-${sanitizedFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('anexos_devolucoes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('anexos_devolucoes')
        .getPublicUrl(filePath);
      anexoUrls.push(publicUrl);
    }

    const { data: devolutionData, error: devolutionError } = await supabase
      .from('devolucoes')
      .insert({
        date: record.date,
        cliente: record.cliente,
        vendedor: record.vendedor,
        rede: record.rede,
        cidade: record.cidade,
        uf: record.uf,
        motorista: record.motorista,
        observacao: record.observacao,
        status: 'pendente',
        usuario_id: user.id,
        anexos_urls: anexoUrls,
      })
      .select()
      .single();

    if (devolutionError) throw devolutionError;

    const produtosParaInserir = record.produtos.map(p => ({
      ...p,
      devolution_id: devolutionData.id,
    }));

    const { error: productsError } = await supabase
      .from('produtos_devolvidos')
      .insert(produtosParaInserir);

    if (productsError) {
      console.error("Failed to insert products, but devolution was created:", productsError);
      throw productsError;
    }
    
    await fetchRecords();

    const finalRecord: DevolutionRecord = {
      id: devolutionData.id,
      usuario_id: user.id,
      created_at: devolutionData.created_at,
      date: record.date,
      cliente: record.cliente,
      vendedor: record.vendedor,
      rede: record.rede,
      cidade: record.cidade,
      uf: record.uf,
      motorista: record.motorista,
      produtos: record.produtos,
      observacao: record.observacao,
      anexos: anexoUrls,
      status: 'pendente',
      usuario: user.email || 'N/A',
      editHistory: [],
    };

    return finalRecord;
  };

  const updateRecord = async (id: string, updates: Partial<Omit<DevolutionRecord, 'produtos' | 'anexos'>> & { produtos?: ProductRecord[], anexos?: (File | string)[] }) => {
    if (!user) throw new Error("Usuário não autenticado.");

    const newFiles = updates.anexos?.filter(a => a instanceof File) as File[] || [];
    const existingUrls = updates.anexos?.filter(a => typeof a === 'string') as string[] || [];
    
    const newAnexoUrls: string[] = [];
    for (const file of newFiles) {
        const sanitizedFileName = sanitizeFileName(file.name);
        const filePath = `${user.id}/${Date.now()}-${sanitizedFileName}`;
        const { error: uploadError } = await supabase.storage.from('anexos_devolucoes').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('anexos_devolucoes').getPublicUrl(filePath);
        newAnexoUrls.push(publicUrl);
    }
    const finalAnexos = [...existingUrls, ...newAnexoUrls];

    const { produtos, anexos, ...mainUpdates } = updates;
    const { error: mainError } = await supabase
        .from('devolucoes')
        .update({ ...mainUpdates, anexos_urls: finalAnexos })
        .eq('id', id);

    if (mainError) throw mainError;

    if (produtos) {
        const produtosParaUpsert = produtos.map(p => ({
            id: p.id,
            devolution_id: id,
            codigo: p.codigo,
            produto: p.produto,
            familia: p.familia,
            grupo: p.grupo,
            quantidade: p.quantidade,
            tipo: p.tipo,
            motivo: p.motivo,
            estado: p.estado,
            reincidencia: p.reincidencia
        }));

        const productsToDelete = records.find(r => r.id === id)?.produtos
            .filter(oldProd => oldProd.id && !produtosParaUpsert.some(newProd => newProd.id === oldProd.id))
            .map(p => p.id);

        if (productsToDelete && productsToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('produtos_devolvidos')
                .delete()
                .in('id', productsToDelete);
            if (deleteError) console.error("Error deleting old products:", deleteError);
        }

        const { error: productsError } = await supabase
            .from('produtos_devolvidos')
            .upsert(produtosParaUpsert, { onConflict: 'id' });

        if (productsError) throw productsError;
    }

    await fetchRecords();
  };

  const deleteRecord = async (id: string) => {
    const { error } = await supabase
      .from('devolucoes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchRecords();
  };

  const filterRecords = useCallback((filters: FilterState) => {
    let filtered = [...records];

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (filters.period && filters.period !== '') {
        const now = new Date();
        switch (filters.period) {
            case 'hoje': startDate = startOfDay(now); endDate = endOfDay(now); break;
            case 'semana_atual': startDate = startOfWeek(now, { weekStartsOn: 1 }); endDate = endOfWeek(now, { weekStartsOn: 1 }); break;
            case 'semana_anterior': const pw = subWeeks(now, 1); startDate = startOfWeek(pw, { weekStartsOn: 1 }); endDate = endOfWeek(pw, { weekStartsOn: 1 }); break;
            case 'mes_atual': startDate = startOfMonth(now); endDate = endOfMonth(now); break;
            case 'mes_anterior': const pm = subMonths(now, 1); startDate = startOfMonth(pm); endDate = endOfMonth(pm); break;
            case 'trimestre_atual': startDate = startOfQuarter(now); endDate = endOfQuarter(now); break;
            case 'trimestre_anterior': const pq = subQuarters(now, 1); startDate = startOfQuarter(pq); endDate = endOfQuarter(pq); break;
            case 'ano_atual': startDate = startOfYear(now); endDate = endOfYear(now); break;
            case 'ano_anterior': const py = subYears(now, 1); startDate = startOfYear(py); endDate = endOfYear(py); break;
        }
    } else {
        if (filters.startDate) startDate = startOfDay(parseISO(filters.startDate));
        if (filters.endDate) endDate = endOfDay(parseISO(filters.endDate));
    }

    if (startDate || endDate) {
        filtered = filtered.filter(record => {
            try {
                const recordDate = parseISO(record.date);
                if (startDate && endDate) return isWithinInterval(recordDate, { start: startDate, end: endDate });
                if (startDate) return recordDate >= startDate;
                if (endDate) return recordDate <= endDate;
                return true;
            } catch (e) { return false; }
        });
    }

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(record =>
            record.cliente.toLowerCase().includes(searchLower) ||
            record.motorista.toLowerCase().includes(searchLower) ||
            (record.usuario && record.usuario.toLowerCase().includes(searchLower)) ||
            record.produtos.some(p =>
                p.produto.toLowerCase().includes(searchLower) ||
                p.motivo.toLowerCase().includes(searchLower) ||
                (p.codigo && p.codigo.toLowerCase().includes(searchLower))
            )
        );
    }
    
    if (filters.cliente) filtered = filtered.filter(r => r.cliente === filters.cliente);
    if (filters.vendedor) filtered = filtered.filter(r => r.vendedor === filters.vendedor);
    if (filters.rede) filtered = filtered.filter(r => r.rede === filters.rede);
    if (filters.cidade) filtered = filtered.filter(r => r.cidade === filters.cidade);
    if (filters.uf) filtered = filtered.filter(r => r.uf === filters.uf);
    if (filters.produto) filtered = filtered.filter(r => r.produtos.some(p => p.produto === filters.produto));
    if (filters.familia) filtered = filtered.filter(r => r.produtos.some(p => p.familia === filters.familia));
    if (filters.grupo) filtered = filtered.filter(r => r.produtos.some(p => p.grupo === filters.grupo));
    if (filters.motivo) filtered = filtered.filter(r => r.produtos.some(p => p.motivo === filters.motivo));
    if (filters.estado) filtered = filtered.filter(r => r.produtos.some(p => p.estado === filters.estado));
    if (filters.reincidencia) filtered = filtered.filter(r => r.produtos.some(p => p.reincidencia === filters.reincidencia));

    return filtered;
  }, [records]);

  return {
    records,
    loading,
    fetchRecords,
    saveRecord,
    updateRecord,
    deleteRecord,
    filterRecords,
  };
};
