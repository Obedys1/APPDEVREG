export interface DevolutionRecord {
  id: string;
  usuario_id: string;
  date: string;
  cliente: string;
  vendedor: string;
  rede: string;
  cidade: string;
  uf: string;
  motorista: string;
  produtos: ProductRecord[];
  observacao: string;
  anexos: string[];
  status: 'pendente' | 'em_analise' | 'revisado' | 'finalizado';
  usuario: string;
  editHistory: EditHistory[];
  created_at: string;
}

export interface OccurrenceRecord {
  id: string;
  usuario_id: string;
  created_at: string;
  data: string;
  cliente: string;
  motorista: string;
  vendedor: string;
  rede: string;
  cidade: string;
  uf: string;
  reincidencia: string;
  setor_responsavel: string;
  motivo_ocorrencia: string;
  resumo_ocorrencia: string;
  tratativa: string;
  impactos: string;
  usuario: string;
}

export interface ProductRecord {
  id?: string;
  codigo: string;
  produto: string;
  familia: string;
  grupo: string;
  quantidade: number;
  tipo: string;
  motivo: string;
  estado: string;
  reincidencia: string;
}

export interface EditHistory {
  usuario: string;
  data: string;
  alteracao: string;
}

export interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  period: string;
  // Devolução
  motivo?: string;
  estado?: string;
  produto?: string;
  familia?: string;
  grupo?: string;
  // Ocorrência
  setor_responsavel?: string;
  motivo_ocorrencia?: string;
  impactos?: string;
  // Comum
  cliente: string;
  reincidencia: string;
  vendedor: string;
  rede: string;
  cidade: string;
  uf: string;
}

export interface ClienteDetalhado {
  vendedor: string;
  rede: string;
  cidade: string;
  uf: string;
  cliente: string;
}
