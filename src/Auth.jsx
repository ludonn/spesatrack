import { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [registered, setRegistered] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setError('Credenziali non valide.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setRegistered(true);
    } catch (error) {
      setError('Registrazione non riuscita. Controlla i dati e riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">💰</div>
        <h1 className="auth-title">SpesaTrack</h1>
        <p className="auth-subtitle">
          {isRegistering ? 'Crea un nuovo account' : 'Bentornato!'}
        </p>
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <button className="btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Caricamento...' : (isRegistering ? 'Registrati' : 'Accedi')}
          </button>
        </form>
        {error && <p className="auth-error">{error}</p>}
        {registered && <p className="auth-success">Sei a un passo dal tracciare le tue spese! Conferma la tua email 📧</p>}
        <p className="auth-toggle">
          {isRegistering ? 'Hai già un account? ' : 'Non hai un account? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsRegistering(!isRegistering); setError(null); }}>
            {isRegistering ? 'Accedi' : 'Registrati'}
          </a>
        </p>
      </div>
    </div>
  );
}
