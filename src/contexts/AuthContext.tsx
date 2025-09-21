import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAndCreateProfile = async (user: User) => {
    try {
      const { error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (selectError && selectError.code === 'PGRST116') {
        console.log(`Profile for user ${user.id} not found. Creating one.`);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id });

        if (insertError) throw insertError;
        console.log(`Profile for user ${user.id} created successfully.`);
      } else if (selectError) {
        throw selectError;
      }
    } catch (error: any) {
      console.error('Error in checkAndCreateProfile:', error.message);
      toast.error('Ocorreu um erro ao configurar seu perfil.');
    }
  };

  useEffect(() => {
    // O listener onAuthStateChange do Supabase é a fonte única da verdade.
    // Ele é disparado uma vez no carregamento inicial e novamente sempre que o estado de autenticação muda.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Se um usuário estiver logado (seja no carregamento ou após o login), garanta que seu perfil exista.
      if (session?.user) {
        await checkAndCreateProfile(session.user);
      }
      
      // A verificação inicial de autenticação está completa, podemos parar o carregamento.
      setLoading(false);
    });

    // Limpa a inscrição quando o componente é desmontado
    return () => {
      subscription.unsubscribe();
    };
  }, []); // O array de dependências vazio garante que isso rode apenas uma vez para configurar o listener.

  const value = {
    session,
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
