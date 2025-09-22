import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LOGO_URL } from '../config';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Login bem-sucedido!');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Cadastro realizado! Verifique seu e-mail para confirmação.');
      }
    } catch (error: any) {
      toast.error(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-background p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface rounded-2xl shadow-2xl p-8 space-y-6"
      >
        <div className="text-center">
          <img src={LOGO_URL} alt="GDM Logo" className="mx-auto h-24" />
          <h2 className="mt-4 text-2xl font-bold text-brand-primary">
            {isLogin ? 'Acessar sistema' : 'Criar conta'}
          </h2>
          <p className="text-brand-text-muted">GDM - Registro de Devoluções e Ocorrências</p>
        </div>
        <form className="space-y-6" onSubmit={handleAuth}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-brand-text-muted">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-brand-background border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-brand-secondary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-brand-text-muted">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-brand-background border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-brand-secondary"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-secondary text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
            </button>
          </div>
        </form>
        <div className="text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-brand-primary hover:underline">
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
