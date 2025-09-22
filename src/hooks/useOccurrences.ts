import { useState, useCallback, useEffect } from 'react';
import { OccurrenceRecord, FilterState } from '../types';
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

export const useOccurrences = () => {
  const { user } = useAuth();
  const [occurrences, setOccurrences] = useState<OccurrenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOccurrences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: occurrencesData, error: occurrencesError } = await supabase
        .from('ocorrencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (occurrencesError) throw occurrencesError;
      if (!occurrencesData) {
        setOccurrences([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(occurrencesData.map(d => d.usuario_id).filter(id => id))];
      let profilesMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        if (profilesError) {
          console.error("Error fetching profiles for occurrences:", profilesError.message);
          toast.error(`Erro ao buscar emails dos usuários para ocorrências.`);
        } else if (profilesData) {
          profilesMap = new Map(profilesData.map(p => [p.id, p.email]));
        }
      }

      const formattedData = occurrencesData.map((d: any) => ({
        ...d,
        usuario: profilesMap.get(d.usuario_id) || d.usuario_id,
      })) as OccurrenceRecord[];

      setOccurrences(formattedData);
    } catch (error: any) => {
      console.error("Error fetching occurrences:", error);
      toast.error(`Erro ao buscar ocorrências: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOccurrences();
  }, [fetchOccurrences]);

  const saveOccurrence = async (occurrence: Omit<OccurrenceRecord, 'id' | 'usuario_id' | 'created_at' | 'usuario'>): Promise<OccurrenceRecord> => {
    if (!user) throw new Error("Usuário não autenticado.");

    const { data: occurrenceData, error: occurrenceError } = await supabase
      .from('ocorrencias')
      .insert({
        ...occurrence,
        usuario_id: user.id,
      })
      .select()
      .single();

    if (occurrenceError) throw occurrenceError;

    await fetchOccurrences();

    const finalRecord: OccurrenceRecord = {
      ...occurrence,
      id: occurrenceData.id,
      usuario_id: user.id,
      created_at: occurrenceData.created_at,
      usuario: user.email || 'N/A',
    };

    return finalRecord;
  };
  
  const updateOccurrence = async (id: string, updates: Partial<Omit<OccurrenceRecord, 'id' | 'usuario_id' | 'created_at' | 'usuario'>>) => {
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from('ocorrencias')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    await fetchOccurrences();
  };

  const deleteOccurrence = async (id: string) => {
    const { error } = await supabase
      .from('ocorrencias')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchOccurrences();
  };

  const deleteMultipleOccurrences = async (ids: string[]) => {
    const { error } = await supabase
      .from('ocorrencias')
      .delete()
      .in('id', ids);
    if (error) throw error;
    await fetchOccurrences();
  };

  const filterOccurrences = useCallback((filters: FilterState) => {
    let filtered = [...occurrences];

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
                const recordDate = parseISO(record.data);
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
            record.motivo_ocorrencia.toLowerCase().includes(searchLower) ||
            record.resumo_ocorrencia.toLowerCase().includes(searchLower)
        );
    }
    
    if (filters.cliente) filtered = filtered.filter(r => r.cliente === filters.cliente);
    if (filters.vendedor) filtered = filtered.filter(r => r.vendedor === filters.vendedor);
    if (filters.rede) filtered = filtered.filter(r => r.rede === filters.rede);
    if (filters.cidade) filtered = filtered.filter(r => r.cidade === filters.cidade);
    if (filters.uf) filtered = filtered.filter(r => r.uf === filters.uf);
    if (filters.reincidencia) filtered = filtered.filter(r => r.reincidencia === filters.reincidencia);
    if (filters.setor_responsavel) filtered = filtered.filter(r => r.setor_responsavel === filters.setor_responsavel);
    if (filters.motivo_ocorrencia) filtered = filtered.filter(r => r.motivo_ocorrencia === filters.motivo_ocorrencia);
    if (filters.impactos) filtered = filtered.filter(r => r.impactos === filters.impactos);

    return filtered.sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
  }, [occurrences]);

  return {
    occurrences,
    loading,
    fetchOccurrences,
    saveOccurrence,
    updateOccurrence,
    deleteOccurrence,
    deleteMultipleOccurrences,
    filterOccurrences,
  };
};
