import { useState, useCallback, useEffect } from 'react';
import { DevolutionRecord, FilterState } from '../types';
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
      const { data, error } = await supabase
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
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = data.map((d: any) => ({
        ...d,
        produtos: d.produtos_devolvidos || [],
        anexos: d.anexos_urls || [],
        usuario: user.email || 'N/A',
        editHistory: [], // This should be fetched if stored in DB
      })) as DevolutionRecord[];

      setRecords(formattedData);
    } catch (error: any) {
      console.error("Error fetching records:", error.message);
      toast.error(`Erro ao buscar registros: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const saveRecord = async (record: Omit<DevolutionRecord, 'id' | 'usuario' | 'editHistory' | 'anexos'> & { anexos: File[] }) => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    const anexoUrls: string[] = [];
    for (const file of record.anexos) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
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
  };

  const updateRecord = async (id: string, updates: Partial<DevolutionRecord>) => {
    const { error } = await supabase
      .from('devolucoes')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
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
            case 'hoje':
                startDate = startOfDay(now);
                endDate = endOfDay(now);
                break;
            case 'semana_atual':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                endDate = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'semana_anterior':
                const prevWeek = subWeeks(now, 1);
                startDate = startOfWeek(prevWeek, { weekStartsOn: 1 });
                endDate = endOfWeek(prevWeek, { weekStartsOn: 1 });
                break;
            case 'mes_atual':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                break;
            case 'mes_anterior':
                const prevMonth = subMonths(now, 1);
                startDate = startOfMonth(prevMonth);
                endDate = endOfMonth(prevMonth);
                break;
            case 'trimestre_atual':
                startDate = startOfQuarter(now);
                endDate = endOfQuarter(now);
                break;
            case 'trimestre_anterior':
                const prevQuarter = subQuarters(now, 1);
                startDate = startOfQuarter(prevQuarter);
                endDate = endOfQuarter(prevQuarter);
                break;
            case 'semestre_atual':
                const currentMonth = now.getMonth();
                if (currentMonth < 6) {
                    startDate = startOfYear(now);
                    endDate = endOfMonth(new Date(now.getFullYear(), 5, 1));
                } else {
                    startDate = startOfMonth(new Date(now.getFullYear(), 6, 1));
                    endDate = endOfYear(now);
                }
                break;
            case 'semestre_anterior':
                 const currentMonthSem = now.getMonth();
                 if (currentMonthSem < 6) {
                    const lastYear = subYears(now, 1);
                    startDate = startOfMonth(new Date(lastYear.getFullYear(), 6, 1));
                    endDate = endOfYear(lastYear);
                 } else {
                    startDate = startOfYear(now);
                    endDate = endOfMonth(new Date(now.getFullYear(), 5, 1));
                 }
                break;
            case 'ano_atual':
                startDate = startOfYear(now);
                endDate = endOfYear(now);
                break;
            case 'ano_anterior':
                const lastYear = subYears(now, 1);
                startDate = startOfYear(lastYear);
                endDate = endOfYear(lastYear);
                break;
        }
    } else {
        if (filters.startDate) startDate = startOfDay(parseISO(filters.startDate));
        if (filters.endDate) endDate = endOfDay(parseISO(filters.endDate));
    }

    if (startDate || endDate) {
        filtered = filtered.filter(record => {
            try {
                const recordDate = parseISO(record.date);
                if (startDate && endDate) {
                    return isWithinInterval(recordDate, { start: startDate, end: endDate });
                }
                if (startDate) return recordDate >= startDate;
                if (endDate) return recordDate <= endDate;
                return true;
            } catch (e) {
                return false;
            }
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
