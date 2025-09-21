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

  useEffect(() => {
    let isMounted = true;

    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (initialSession) {
          // A função RPC 'ensure_profile_exists' no banco de dados foi atualizada para ser idempotente.
          // Ela agora lida com casos onde o perfil já existe (ON CONFLICT DO NOTHING),
          // resolvendo o erro de "chave duplicada" que causava o loop de autenticação.
          const { error: rpcError } = await supabase.rpc('ensure_profile_exists');
          if (rpcError) {
            console.error("Error ensuring profile, signing out:", rpcError.message);
            toast.error('Falha ao verificar seu perfil. Fazendo logout por segurança.');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setSession(initialSession);
            setUser(initialSession.user);
          }
        }
      } catch (error: any) {
        console.error("Critical error during initial session check:", error.message);
        toast.error("Ocorreu um erro crítico na autenticação.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (_event === 'SIGNED_IN' && session) {
          (async () => {
            const { error } = await supabase.rpc('ensure_profile_exists');
            if (error) {
              console.error("Error ensuring profile on SIGNED_IN event:", error.message);
              toast.error('Falha ao sincronizar o perfil após o login.');
            }
          })();
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = { session, user, loading };

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
