# Fit Hub AI Coach

Web app fitness con coach AI in italiano: raccoglie i tuoi dati essenziali (peso, altezza, obiettivi, livello), poi ti propone consigli personalizzati per diventare piu muscoloso e piu magro con allenamenti, ricette e strategie di recupero.

Il chatbot e creato direttamente dentro l'app (logica locale), senza API di chatbot esterne.

## Funzionalita principali

- Onboarding fitness guidato con domande chiave
- Metriche iniziali automatiche (BMI e BMR indicativi)
- Chat AI locale personalizzata su profilo e obiettivo
- Prima domanda obbligatoria: che tipo di fisico vuoi raggiungere
- Accesso utente (registrazione/login/logout)
- Memoria persistente per profilo, obiettivo e storico chat per ogni utente
- Supporto voce: parla al coach e ascolta la risposta
- UI moderna, responsive e ottimizzata desktop/mobile

## Requisiti

- Node.js 18+ (consigliato Node.js 20+)

## Setup

1. Installa dipendenze:

```bash
npm install
```

2. Avvia l'app:

```bash
npm run dev
```

3. Apri il browser su:

```text
http://localhost:3000
```

## Deploy su GitHub Pages

Il repository include il workflow [deploy-pages.yml](.github/workflows/deploy-pages.yml) che pubblica automaticamente la cartella [public](public) ad ogni push su `main`.

In aggiunta, per compatibilita con Pages in modalita legacy (source su branch), il workflow [sync-pages-root.yml](.github/workflows/sync-pages-root.yml) sincronizza automaticamente i file root usati da Pages con i file in [public](public):

- [public/index.html](public/index.html) -> [index.html](index.html)
- [public/app.js](public/app.js) -> [app.js](app.js)
- [public/styles.css](public/styles.css) -> [styles.css](styles.css)

1. Vai su `Settings > Pages` del repository.
2. In `Build and deployment`, seleziona `Source: GitHub Actions`.
3. Fai push su `main`.
4. Attendi il completamento del workflow `Deploy GitHub Pages`.
5. Apri l'URL Pages del repo:

```text
https://gcasaldi.github.io/fit-hub/
```

Su GitHub Pages l'app funziona normalmente, perche la logica del chatbot e locale nel browser.

### Sync manuale (opzionale)

Se vuoi forzare la sincronizzazione in locale prima del commit:

```bash
npm run sync:pages-root
```

## Come usarla

1. Compila il profilo fitness con dati reali.
2. Crea account o accedi con username/password.
3. Clicca su `Attiva Coach`.
4. Rispondi alla domanda sul fisico target.
5. Chiedi al coach un piano pratico, per esempio:
	- "Fammi un piano allenamento + ricette per 7 giorni"
	- "Adatta il piano a 3 giorni a settimana"
	- "Dammi 5 colazioni ad alta proteina"

## Struttura progetto

- `server.js`: server Express per hosting statico
- `public/index.html`: layout principale
- `public/styles.css`: stile visuale e responsive design
- `public/app.js`: logica onboarding, chatbot locale, chat, voce
- `.github/workflows/deploy-pages.yml`: deploy automatico su GitHub Pages
- `.github/workflows/sync-pages-root.yml`: sync automatico root Pages da `public/`
- `scripts/sync-pages-root.sh`: script di sincronizzazione root Pages

## Note importanti

- Questa app fornisce supporto educativo e motivazionale, non sostituisce il parere medico.
- Per condizioni cliniche o infortuni, confrontati con professionisti qualificati.