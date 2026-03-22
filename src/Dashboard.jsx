import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const CATEGORIE_DEFAULT = ['Cibo', 'Trasporti', 'Casa', 'Salute', 'Intrattenimento', 'Altro'];

const CATEGORIE_META = {
  'Cibo':            { emoji: '🍔', color: '#16a34a' },
  'Trasporti':       { emoji: '🚗', color: '#2563eb' },
  'Casa':            { emoji: '🏠', color: '#ea580c' },
  'Salute':          { emoji: '❤️', color: '#dc2626' },
  'Intrattenimento': { emoji: '🎬', color: '#9333ea' },
  'Altro':           { emoji: '💡', color: '#64748b' },
};

const getCatMeta = (nome) => CATEGORIE_META[nome] || { emoji: '📌', color: '#94a3b8' };

const formatCurrency = (amount) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

export default function Dashboard({ user }) {
  const [spese, setSpese] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorieCustom, setCategorieCustom] = useState([]);
  const [budgetMap, setBudgetMap] = useState({});
  const [ricorrenti, setRicorrenti] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Form aggiungi spesa
  const [importo, setImporto] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIE_DEFAULT[0]);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState('');

  // Form impostazioni - categorie
  const [nuovaCategoria, setNuovaCategoria] = useState('');

  // Form impostazioni - budget
  const [budgetCategoria, setBudgetCategoria] = useState('');
  const [budgetImporto, setBudgetImporto] = useState('');

  // Form impostazioni - ricorrenti
  const [ricImporto, setRicImporto] = useState('');
  const [ricCategoria, setRicCategoria] = useState(CATEGORIE_DEFAULT[0]);
  const [ricNota, setRicNota] = useState('');

  // Navigazione mese
  const oggi = new Date();
  const [meseSel, setMeseSel] = useState({ anno: oggi.getFullYear(), mese: oggi.getMonth() });
  const mesePrecedente = () => setMeseSel(({ anno, mese }) => mese === 0 ? { anno: anno - 1, mese: 11 } : { anno, mese: mese - 1 });
  const meseSuccessivo = () => setMeseSel(({ anno, mese }) => mese === 11 ? { anno: anno + 1, mese: 0 } : { anno, mese: mese + 1 });
  const isMeseCorrente = meseSel.anno === oggi.getFullYear() && meseSel.mese === oggi.getMonth();

  const tutteLeCategorie = [...CATEGORIE_DEFAULT, ...categorieCustom.map(c => c.nome)];

  useEffect(() => {
    Promise.all([caricaSpese(), caricaCategorie(), caricaBudget(), caricaRicorrenti()]);
  }, []);

  // ── Caricamento dati ──

  const caricaSpese = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spese')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setSpese(data);
    } catch (error) {
      console.error('Errore nel caricamento delle spese:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const caricaCategorie = async () => {
    const { data, error } = await supabase
      .from('categorie').select('*').eq('user_id', user.id).order('created_at');
    if (!error) setCategorieCustom(data);
  };

  const caricaBudget = async () => {
    const { data, error } = await supabase
      .from('budget').select('*').eq('user_id', user.id);
    if (!error) {
      const map = {};
      data.forEach(b => { map[b.categoria] = b.importo; });
      setBudgetMap(map);
    }
  };

  const caricaRicorrenti = async () => {
    const { data, error } = await supabase
      .from('ricorrenti').select('*').eq('user_id', user.id).order('created_at');
    if (!error) setRicorrenti(data);
  };

  // ── Spese ──

  const aggiungiSpesa = async (e) => {
    e.preventDefault();
    setSaveError(null);
    const importoNum = parseFloat(importo);
    if (!Number.isFinite(importoNum) || importoNum <= 0) {
      setSaveError("L'importo deve essere un numero positivo.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('spese')
        .insert([{ importo: importoNum, categoria, data, nota: nota.slice(0, 200), user_id: user.id }]);
      if (error) throw error;
      await caricaSpese();
      setImporto('');
      setCategoria(tutteLeCategorie[0]);
      setData(new Date().toISOString().slice(0, 10));
      setNota('');
    } catch (error) {
      console.error("Errore nell'aggiunta della spesa:", error.message);
      setSaveError("Errore nel salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  const eliminaSpesa = async (id) => {
    if (window.confirm('Eliminare questa spesa?')) {
      try {
        const { error } = await supabase.from('spese').delete().match({ id, user_id: user.id });
        if (error) throw error;
        await caricaSpese();
      } catch (error) {
        console.error("Errore nell'eliminazione della spesa:", error.message);
      }
    }
  };

  // ── Categorie personalizzate ──

  const aggiungiCategoria = async (e) => {
    e.preventDefault();
    if (!nuovaCategoria.trim()) return;
    const { error } = await supabase
      .from('categorie').insert([{ nome: nuovaCategoria.trim(), user_id: user.id }]);
    if (!error) {
      await caricaCategorie();
      setNuovaCategoria('');
    }
  };

  const eliminaCategoria = async (id) => {
    const { error } = await supabase.from('categorie').delete().match({ id, user_id: user.id });
    if (!error) await caricaCategorie();
  };

  // ── Budget ──

  const salvaBudget = async (e) => {
    e.preventDefault();
    if (!budgetCategoria || !budgetImporto) return;
    const { error } = await supabase.from('budget').upsert(
      [{ user_id: user.id, categoria: budgetCategoria, importo: parseFloat(budgetImporto) }],
      { onConflict: 'user_id,categoria' }
    );
    if (!error) {
      await caricaBudget();
      setBudgetCategoria('');
      setBudgetImporto('');
    }
  };

  const eliminaBudget = async (cat) => {
    const { error } = await supabase.from('budget').delete().match({ user_id: user.id, categoria: cat });
    if (!error) await caricaBudget();
  };

  // ── Ricorrenti ──

  const aggiungiRicorrente = async (e) => {
    e.preventDefault();
    const ricImportoNum = parseFloat(ricImporto);
    if (!Number.isFinite(ricImportoNum) || ricImportoNum <= 0 || !ricCategoria) return;
    const { error } = await supabase.from('ricorrenti')
      .insert([{ importo: ricImportoNum, categoria: ricCategoria, nota: ricNota.slice(0, 200), user_id: user.id }]);
    if (!error) {
      await caricaRicorrenti();
      setRicImporto('');
      setRicNota('');
    }
  };

  const eliminaRicorrente = async (id) => {
    const { error } = await supabase.from('ricorrenti').delete().match({ id, user_id: user.id });
    if (!error) await caricaRicorrenti();
  };

  const inserisciDaRicorrente = async (r) => {
    const dataOggi = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('spese')
      .insert([{ importo: r.importo, categoria: r.categoria, nota: r.nota, data: dataOggi, user_id: user.id }]);
    if (!error) await caricaSpese();
  };

  // ── Calcoli analisi ──

  const speseMese = spese.filter(s => {
    const d = new Date(s.data);
    return d.getMonth() === meseSel.mese && d.getFullYear() === meseSel.anno;
  });

  const totaleMese = speseMese.reduce((acc, s) => acc + s.importo, 0);
  const giorniTrascorsi = isMeseCorrente
    ? oggi.getDate()
    : new Date(meseSel.anno, meseSel.mese + 1, 0).getDate();
  const mediaGiornaliera = totaleMese > 0 ? totaleMese / giorniTrascorsi : 0;

  const totalePerCategoria = speseMese.reduce((acc, s) => {
    acc[s.categoria] = (acc[s.categoria] || 0) + s.importo;
    return acc;
  }, {});

  const categorieAnalisi = tutteLeCategorie
    .filter(c => totalePerCategoria[c] || budgetMap[c])
    .sort((a, b) => (budgetMap[b] ? 1 : 0) - (budgetMap[a] ? 1 : 0));

  const nomeMese = new Date(meseSel.anno, meseSel.mese).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // ── Render ──

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">💰 SpesaTrack</div>
          <button onClick={() => supabase.auth.signOut()} className="btn-logout">Esci</button>
        </div>
      </header>

      <main className="app-main">

        {/* ── Tab: Home ── */}
        {activeTab === 'home' && (
          <div className="tab-content">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Totale {isMeseCorrente ? 'questo mese' : 'del mese'}</div>
                <div className="stat-value">{formatCurrency(totaleMese)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Media giornaliera</div>
                <div className="stat-value">{formatCurrency(mediaGiornaliera)}</div>
              </div>
            </div>

            <div className="month-nav">
              <button onClick={mesePrecedente} className="btn-icon">←</button>
              <span className="month-label">{nomeMese}{isMeseCorrente && ' ·'}{isMeseCorrente && <span style={{ color: 'var(--primary)', fontWeight: 400 }}> corrente</span>}</span>
              <button onClick={meseSuccessivo} className="btn-icon" disabled={isMeseCorrente}>→</button>
            </div>

            <div className="card">
              <h2 className="card-title">Nuova spesa</h2>
              <form onSubmit={aggiungiSpesa}>
                <div className="form-grid">
                  <input
                    type="number" placeholder="Importo (€)" value={importo}
                    onChange={e => setImporto(e.target.value)}
                    required step="0.01" min="0" autoComplete="off" className="input"
                  />
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input">
                    {tutteLeCategorie.map(c => (
                      <option key={c} value={c}>{getCatMeta(c).emoji} {c}</option>
                    ))}
                  </select>
                  <input
                    type="date" value={data}
                    onChange={e => setData(e.target.value)}
                    required className="input"
                  />
                  <input
                    type="text" placeholder="Nota (opzionale)" value={nota}
                    onChange={e => setNota(e.target.value)} className="input" maxLength={200}
                  />
                </div>
                {saveError && <p className="form-error">{saveError}</p>}
                <button type="submit" className="btn-primary btn-full" disabled={saving}>
                  {saving ? 'Salvataggio...' : 'Aggiungi spesa'}
                </button>
              </form>
            </div>

            {ricorrenti.length > 0 && (
              <div className="card">
                <h2 className="card-title">Ricorrenti</h2>
                <ul className="ricorrenti-list">
                  {ricorrenti.map(r => {
                    const meta = getCatMeta(r.categoria);
                    return (
                      <li key={r.id} className="ricorrente-item">
                        <span
                          className="cat-badge"
                          style={{ background: meta.color + '20', color: meta.color }}
                        >
                          {meta.emoji} {r.categoria}
                        </span>
                        <span className="ricorrente-nota">{r.nota || r.categoria}</span>
                        <strong className="ricorrente-importo">{formatCurrency(r.importo)}</strong>
                        <button onClick={() => inserisciDaRicorrente(r)} className="btn-small">
                          Inserisci
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {categorieAnalisi.length > 0 && (
              <div className="card">
                <h2 className="card-title">Per categoria</h2>
                <ul className="cat-list">
                  {categorieAnalisi.map(c => {
                    const speso = totalePerCategoria[c] || 0;
                    const budgetCat = budgetMap[c];
                    const pct = budgetCat ? Math.min((speso / budgetCat) * 100, 100) : null;
                    const meta = getCatMeta(c);
                    return (
                      <li key={c}>
                        <div className="cat-item-row">
                          <span
                            className="cat-badge"
                            style={{ background: meta.color + '20', color: meta.color }}
                          >
                            {meta.emoji} {c}
                          </span>
                          <span className="cat-amounts">
                            <strong>{formatCurrency(speso)}</strong>
                            {budgetCat && <span className="cat-budget">/ {formatCurrency(budgetCat)}</span>}
                          </span>
                        </div>
                        {pct !== null && (
                          <div className="budget-bar-bg">
                            <div
                              className={`budget-bar-fill${pct >= 100 ? ' over' : pct >= 80 ? ' near' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Storico ── */}
        {activeTab === 'storico' && (
          <div className="tab-content">
            <div className="month-nav">
              <button onClick={mesePrecedente} className="btn-icon">←</button>
              <span className="month-label">{nomeMese}</span>
              <button onClick={meseSuccessivo} className="btn-icon" disabled={isMeseCorrente}>→</button>
            </div>

            <div className="card">
              <h2 className="card-title">
                Spese — {speseMese.length > 0 ? formatCurrency(totaleMese) : ''}
              </h2>
              {loading ? (
                <p className="text-muted">Caricamento...</p>
              ) : speseMese.length === 0 ? (
                <p className="text-muted">Nessuna spesa in questo periodo.</p>
              ) : (
                <ul className="spese-list">
                  {speseMese.map(s => {
                    const meta = getCatMeta(s.categoria);
                    return (
                      <li key={s.id} className="spesa-item">
                        <div
                          className="spesa-emoji"
                          style={{ background: meta.color + '18' }}
                        >
                          {meta.emoji}
                        </div>
                        <div className="spesa-info">
                          <div className="spesa-nota">{s.nota || s.categoria}</div>
                          <div className="spesa-meta">
                            {s.categoria} · {new Date(s.data).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                        <strong className="spesa-importo">{formatCurrency(s.importo)}</strong>
                        <button onClick={() => eliminaSpesa(s.id)} className="btn-delete">✕</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Impostazioni ── */}
        {activeTab === 'impostazioni' && (
          <div className="tab-content">
            <div className="card">
              <h2 className="card-title">Categorie personalizzate</h2>
              <form onSubmit={aggiungiCategoria} className="form-inline">
                <input
                  type="text" placeholder="Nome categoria" value={nuovaCategoria}
                  onChange={e => setNuovaCategoria(e.target.value)} className="input" maxLength={50}
                />
                <button type="submit" className="btn-primary">Aggiungi</button>
              </form>
              {categorieCustom.length > 0 && (
                <ul className="settings-list">
                  {categorieCustom.map(c => (
                    <li key={c.id}>
                      <span>{c.nome}</span>
                      <button onClick={() => eliminaCategoria(c.id)} className="btn-delete">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="card-title">Budget mensile per categoria</h2>
              <form onSubmit={salvaBudget} className="form-inline">
                <select value={budgetCategoria} onChange={e => setBudgetCategoria(e.target.value)} required className="input">
                  <option value="">Categoria...</option>
                  {tutteLeCategorie.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="number" placeholder="€" value={budgetImporto}
                  onChange={e => setBudgetImporto(e.target.value)}
                  step="0.01" min="0" required className="input"
                  style={{ maxWidth: '90px' }}
                />
                <button type="submit" className="btn-primary">Salva</button>
              </form>
              {Object.keys(budgetMap).length > 0 && (
                <ul className="settings-list">
                  {Object.entries(budgetMap).map(([cat, imp]) => (
                    <li key={cat}>
                      <span>{cat}: <strong>{formatCurrency(imp)}</strong>/mese</span>
                      <button onClick={() => eliminaBudget(cat)} className="btn-delete">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="card-title">Template spese ricorrenti</h2>
              <form onSubmit={aggiungiRicorrente}>
                <div className="form-grid">
                  <input
                    type="number" placeholder="Importo (€)" value={ricImporto}
                    onChange={e => setRicImporto(e.target.value)}
                    step="0.01" min="0" required className="input"
                  />
                  <select value={ricCategoria} onChange={e => setRicCategoria(e.target.value)} required className="input">
                    {tutteLeCategorie.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="text" placeholder="Nota (es. Affitto, Netflix...)" value={ricNota}
                    onChange={e => setRicNota(e.target.value)} className="input col-span-2" maxLength={200}
                  />
                </div>
                <button type="submit" className="btn-primary btn-full">Aggiungi template</button>
              </form>
              {ricorrenti.length > 0 && (
                <ul className="settings-list">
                  {ricorrenti.map(r => (
                    <li key={r.id}>
                      <span>{r.nota || r.categoria} — <strong>{formatCurrency(r.importo)}</strong> ({r.categoria})</span>
                      <button onClick={() => eliminaRicorrente(r.id)} className="btn-delete">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav">
        <button
          onClick={() => setActiveTab('home')}
          className={`bottom-nav-item${activeTab === 'home' ? ' active' : ''}`}
        >
          <span>📊</span>
          <span>Home</span>
        </button>
        <button
          onClick={() => setActiveTab('storico')}
          className={`bottom-nav-item${activeTab === 'storico' ? ' active' : ''}`}
        >
          <span>📋</span>
          <span>Storico</span>
        </button>
        <button
          onClick={() => setActiveTab('impostazioni')}
          className={`bottom-nav-item${activeTab === 'impostazioni' ? ' active' : ''}`}
        >
          <span>⚙️</span>
          <span>Impostazioni</span>
        </button>
      </nav>
    </div>
  );
}
