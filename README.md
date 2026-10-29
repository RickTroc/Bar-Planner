# Fondo Bar — web app condivisa

Web app statica in italiano per gestire il fondo cassa del bar. Interfaccia pubblicata con GitHub Pages; autenticazione e database condiviso tramite Supabase.

## Funzioni incluse
- Login tramite link via email (magic link).
- Membri del team pre-caricati.
- Quote settimanali registrate come versamenti effettivi.
- Spese di bevande, cornetti e tramezzini con calcolo automatico del totale.
- Dashboard mensile, saldo del periodo, spese per categoria e storico.
- Eliminazione dei movimenti e export CSV.
- Protezione dei dati tramite Row Level Security (RLS) in Supabase.

## 1. Crea il database Supabase
1. Crea un progetto su https://supabase.com/.
2. Apri **SQL Editor** e incolla/esegui tutto il file `supabase/schema.sql`.
3. Vai in **Authentication → Sign In / Providers** e disattiva le registrazioni pubbliche (signups / Allow new users OFF).
4. In **Authentication → Users**, invita ogni collega tramite **Invite user**. Gli utenti devono accedere con l'indirizzo invitato.
5. In **Project Settings → API** copia il Project URL e la chiave pubblica `anon`/`publishable`. Non usare mai la `service_role`/secret key nel browser.

## 2. Configura l'app
Apri `app.js` e sostituisci:
```js
const SUPABASE_URL = "INSERISCI_QUI_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "INSERISCI_QUI_SUPABASE_PUBLISHABLE_OR_ANON_KEY";
```
con i valori del tuo progetto Supabase. La chiave pubblica è pensata per essere usata nel browser; la sicurezza deriva dalle policy RLS. Non inserire segreti.

## 3. Configura gli URL di autenticazione
In Supabase, apri **Authentication → URL Configuration**:
- Site URL: l'URL GitHub Pages del sito, ad esempio `https://TUO-UTENTE.github.io/NOME-REPOSITORY/`.
- Redirect URLs: aggiungi lo stesso URL GitHub Pages e l'URL locale di test se ti serve.

## 4. Pubblica su GitHub Pages
1. Crea un repository GitHub, ad esempio `fondo-bar`.
2. Carica tutti i file di questa cartella, mantenendo la cartella `.github/workflows/`.
3. In **Settings → Pages**, imposta la pubblicazione da **GitHub Actions**.
4. Il workflow `Deploy to GitHub Pages` pubblicherà `index.html`, `styles.css` e `app.js` a ogni push sul branch `main`.
5. Attendi il completamento del workflow e apri l'URL Pages. Per testare localmente puoi usare un server statico (non aprire `index.html` direttamente come file).

## 5. Uso quotidiano
- Ogni collega entra tramite il link email.
- In **Aggiungi spesa** registra prodotto e quantità.
- In **Registra quota** seleziona collega, data, inizio settimana e importo effettivamente versato.
- Cambia il selettore mese per vedere i movimenti e il saldo del periodo.
- Esporta i movimenti del mese in CSV quando serve.

## Importante: come leggere il saldo
Il saldo mostrato in dashboard è il **saldo netto del mese selezionato** (quote incassate in quel mese meno spese di quel mese), non necessariamente il contante totale accumulato da tutti i mesi precedenti. Lo storico mensile mostra il netto di ciascun mese. Per la cassa progressiva completa, si può aggiungere un KPI dedicato che sommi tutti i movimenti fino al mese selezionato.

## Sicurezza e limiti della prima versione
- La pagina GitHub Pages è pubblica come URL, ma senza login non carica i dati.
- Con le registrazioni pubbliche disattivate e inviti gestiti dall'amministratore, solo utenti invitati possono autenticarsi.
- Le policy RLS consentono agli utenti autenticati di leggere e modificare tutti i movimenti: è quanto richiesto per questa prima versione. Ogni collega può anche eliminare movimenti; il prototipo chiede conferma ma non implementa un audit log.
- Il campo “quote da completare” è una stima indicativa basata sul numero di settimane del mese e sui pagamenti registrati, non un conteggio puntuale di ogni collega/settimana. Per una riconciliazione esatta occorre confrontare quote attese e pagamenti per ogni settimana.
- I prezzi iniziali sono quelli forniti: caffè €1,20; cappuccino €1,50; cornetto €1,00; tramezzino €2,70.
- La prima versione non processa pagamenti online: registra solo gli importi ricevuti in cassa.

## File
- `index.html`: struttura della dashboard e form.
- `styles.css`: stile responsive.
- `app.js`: logica client e connessione Supabase.
- `supabase/schema.sql`: tabelle, policy RLS e membri iniziali.
- `.github/workflows/deploy.yml`: deploy automatico su GitHub Pages.
