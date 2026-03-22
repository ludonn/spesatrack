# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # avvia il server di sviluppo (localhost:5173)
npm run build     # compila per produzione in dist/
npm run lint      # ESLint
npm run preview   # anteprima del build di produzione
```

## Architecture

SPA React + Vite senza routing. Un'unica pagina che mostra `Auth` o `Dashboard` in base alla sessione Supabase.

**Flusso auth:** `App.jsx` ascolta `onAuthStateChange` e passa `session.user` a `Dashboard`. Non ci sono route protette — il gate è un semplice ternario in `App.jsx`. L'auth usa `signInWithPassword` (email+password, non magic link) — l'email è solo un identificatore, non serve che la casella esista realmente. La conferma email va disattivata in Supabase Dashboard → Authentication → Providers → Email.

**Backend:** Supabase (PostgreSQL + Auth). Nessun server custom — tutta la logica dati è in `Dashboard.jsx` via Supabase JS client (`src/supabase.js`).

**Sicurezza dati:** Tutte le tabelle hanno RLS attiva. Le policy richiedono `auth.uid() = user_id` su SELECT, INSERT, UPDATE e DELETE. Ogni query lato client include già `user_id: user.id` nei filtri come secondo livello di protezione.

**Analisi:** Calcolate lato client in `Dashboard.jsx` a partire dai dati già in memoria — nessuna query aggiuntiva. Supportano navigazione tra mesi passati tramite stato `meseSel`.

**Categorie:** Le categorie di default sono in `CATEGORIE_DEFAULT` (costante in `Dashboard.jsx`). Ogni categoria ha emoji e colore associati in `CATEGORIE_META`. L'utente può aggiungere categorie personalizzate salvate in DB (tabella `categorie`). Ovunque si usa la lista combinata `tutteLeCategorie = [...CATEGORIE_DEFAULT, ...categorieCustom]`.

## UI

**Layout:** `App.jsx` renderizza direttamente `Auth` o `Dashboard` (senza wrapper). `Dashboard` gestisce il proprio layout con header sticky + contenuto scrollabile + bottom navigation fissa.

**Navigazione:** Bottom tab bar con 3 tab — `home` (analisi + form nuova spesa + ricorrenti), `storico` (lista spese del mese), `impostazioni` (categorie, budget, template ricorrenti). Stato `activeTab` in `Dashboard.jsx`.

**Stili:** Due file CSS:
- `src/index.css` — reset globale minimale (`box-sizing`, `body margin`, `#root min-height`)
- `src/App.css` — design system completo con variabili CSS (`--primary: #6366f1`, `--bg`, `--surface`, ecc.), classi utility (`.card`, `.input`, `.btn-primary`, `.btn-full`, `.cat-badge`, `.budget-bar-*`, ecc.)

**Classi principali:** `.app` (layout colonna, max-width 600px), `.app-header` (sticky), `.app-main` (padding-bottom 5.5rem per la bottom nav), `.bottom-nav` (fixed, z-index 10), `.form-grid` (griglia 2 colonne per i form), `.stat-card`, `.spesa-item`, `.cat-badge`.

## Variabili d'ambiente

Richiede un file `.env` con:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Le variabili `VITE_*` vengono incorporate nel bundle JS da Vite — non mettere segreti qui.

## Schema DB

### Tabella `spese`
| Campo | Tipo |
|-------|------|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| importo | numeric |
| categoria | text |
| data | date |
| nota | text (nullable) |
| created_at | timestamptz |

### Tabella `categorie`
Categorie personalizzate per utente.
| Campo | Tipo |
|-------|------|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| nome | text |
| created_at | timestamptz |

### Tabella `budget`
Budget mensile per categoria (upsert su conflitto `user_id, categoria`).
| Campo | Tipo |
|-------|------|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| categoria | text |
| importo | numeric |

### Tabella `ricorrenti`
Template di spese ricorrenti. L'utente le inserisce manualmente con "Inserisci oggi" — nessuna generazione automatica.
| Campo | Tipo |
|-------|------|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| importo | numeric |
| categoria | text |
| nota | text (nullable) |
| created_at | timestamptz |
