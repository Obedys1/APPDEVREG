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
}

export interface ProductRecord {
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
  motivo: string;
  estado: string;
  produto: string;
  cliente: string;
  reincidencia: string;
  familia: string;
  grupo: string;
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
