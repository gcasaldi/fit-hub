# Fit Hub AI Coach

Web app fitness con coach AI in italiano: raccoglie i tuoi dati essenziali (peso, altezza, obiettivi, livello), poi ti propone consigli personalizzati per diventare piu muscoloso e piu magro con allenamenti, ricette e strategie di recupero.

Il chatbot e creato direttamente dentro l'app (logica locale), senza API di chatbot esterne.

## Funzionalita principali

- Onboarding fitness guidato con domande chiave
- Metriche iniziali automatiche (BMI e BMR indicativi)
- Chat AI locale personalizzata su profilo e obiettivo
- Prima domanda obbligatoria: che tipo di fisico vuoi raggiungere
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

1. Vai su `Settings > Pages` del repository.
2. In `Build and deployment`, seleziona `Source: GitHub Actions`.
3. Fai push su `main`.
4. Attendi il completamento del workflow `Deploy GitHub Pages`.
5. Apri l'URL Pages del repo:

```text
https://gcasaldi.github.io/fit-hub/
```

Su GitHub Pages l'app funziona normalmente, perche la logica del chatbot e locale nel browser.

## Come usarla

1. Compila il profilo fitness con dati reali.
2. Clicca su `Attiva Coach`.
3. Chiedi al coach un piano pratico, per esempio:
	- "Fammi un piano allenamento + ricette per 7 giorni"
	- "Adatta il piano a 3 giorni a settimana"
	- "Dammi 5 colazioni ad alta proteina"

## Struttura progetto

- `server.js`: server Express per hosting statico
- `public/index.html`: layout principale
- `public/styles.css`: stile visuale e responsive design
- `public/app.js`: logica onboarding, chatbot locale, chat, voce
- `.github/workflows/deploy-pages.yml`: deploy automatico su GitHub Pages

## Note importanti

- Questa app fornisce supporto educativo e motivazionale, non sostituisce il parere medico.
- Per condizioni cliniche o infortuni, confrontati con professionisti qualificati.