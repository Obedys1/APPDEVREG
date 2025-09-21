import React from 'react';
import { Construction } from 'lucide-react';

export const Ocorrencias: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-brand-text-muted p-10">
      <Construction className="h-24 w-24 text-brand-secondary mb-6" />
      <h1 className="text-4xl font-bold text-brand-primary mb-2">Registrar Ocorrência</h1>
      <p className="text-lg">Esta funcionalidade está em desenvolvimento.</p>
      <p className="mt-4">Em breve, você poderá registrar ocorrências diretamente por aqui. Volte em breve!</p>
    </div>
  );
};
