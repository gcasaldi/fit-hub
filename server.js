const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function buildFitnessPrompt(profile, userMessage) {
  const {
    name,
    age,
    sex,
    weightKg,
    heightCm,
    trainingLevel,
    trainingDays,
    equipment,
    dietStyle,
    allergies,
    goal,
    notes
  } = profile;

  return [
    "Sei un coach fitness e nutrizione d'elite, pratico e scientifico.",
    "Parla in italiano semplice e motivante.",
    "Obiettivo principale: aiutare la persona a diventare muscolosa e magra in modo sostenibile.",
    "Regole:",
    "1) Dai sempre indicazioni realistiche e graduali.",
    "2) Includi allenamento + nutrizione + recupero.",
    "3) Quando utile, proponi 2-3 alternative.",
    "4) Evita promesse mediche; se emergono rischi seri invita a consultare un professionista.",
    "5) Rispondi con sezioni brevi e operative.",
    "6) Se i dati non bastano, fai massimo 2 domande mirate.",
    "",
    "PROFILO UTENTE:",
    `- Nome: ${name || "N/D"}`,
    `- Eta: ${age || "N/D"}`,
    `- Sesso: ${sex || "N/D"}`,
    `- Peso (kg): ${weightKg || "N/D"}`,
    `- Altezza (cm): ${heightCm || "N/D"}`,
    `- Livello allenamento: ${trainingLevel || "N/D"}`,
    `- Giorni allenamento a settimana: ${trainingDays || "N/D"}`,
    `- Attrezzatura: ${equipment || "N/D"}`,
    `- Stile alimentare: ${dietStyle || "N/D"}`,
    `- Allergie/intolleranze: ${allergies || "Nessuna"}`,
    `- Obiettivo: ${goal || "N/D"}`,
    `- Note personali: ${notes || "Nessuna"}`,
    "",
    "RICHIESTA UTENTE:",
    userMessage
  ].join("\n");
}

app.post("/api/chat", async (req, res) => {
  try {
    const { profile, message, history } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Messaggio non valido." });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Manca OPENAI_API_KEY. Crea un file .env partendo da .env.example"
      });
    }

    const systemPrompt = buildFitnessPrompt(profile || {}, message);

    const messages = [
      { role: "system", content: systemPrompt },
      ...((history || []).slice(-8).map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: String(item.content || "")
      }))),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.7,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data?.error?.message || "Errore API AI";
      return res.status(response.status).json({ error: apiError });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return res.status(500).json({ error: "Nessuna risposta valida dal modello." });
    }

    return res.json({ reply: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: "Errore interno server." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Fit Hub AI attivo su http://localhost:${PORT}`);
});
