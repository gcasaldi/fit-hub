const profileForm = document.getElementById("profile-form");
const metricsBox = document.getElementById("metrics");
const coachState = document.getElementById("coach-state");
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");
const msgTemplate = document.getElementById("msg-template");

const appConfig = window.FIT_HUB_CONFIG || {};
const API_BASE_URL =
  typeof appConfig.apiBaseUrl === "string" ? appConfig.apiBaseUrl.replace(/\/+$/, "") : "";
const IS_GITHUB_PAGES = window.location.hostname.endsWith("github.io");

let profile = null;
let history = [];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.lang = "it-IT";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

function calcMetrics(weightKg, heightCm, age, sex) {
  const hMeters = heightCm / 100;
  const bmi = weightKg / (hMeters * hMeters);
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === "Donna" ? base - 161 : base + 5;
  return { bmi, bmr };
}

function addMessage(role, text) {
  const node = msgTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(role);
  node.querySelector(".meta").textContent =
    role === "user" ? "Tu" : role === "error" ? "Sistema" : "Coach AI";
  node.querySelector(".content").textContent = text;
  chatWindow.appendChild(node);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setChatEnabled(enabled) {
  chatInput.disabled = !enabled;
  sendBtn.disabled = !enabled;
  voiceBtn.disabled = !enabled || !recognition;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "it-IT";
  utter.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function buildApiUrl(pathname) {
  return API_BASE_URL ? `${API_BASE_URL}${pathname}` : pathname;
}

function buildDemoReply(userText, userProfile) {
  const days = Number(userProfile?.trainingDays) || 3;
  const goal = userProfile?.goal || "ricomposizione corporea";
  const equipment = userProfile?.equipment || "corpo libero";
  const dietStyle = userProfile?.dietStyle || "onnivoro";
  const kcalHint = Math.round((Number(userProfile?.weightKg) || 70) * 31);

  return [
    "Modalita demo Pages attiva (senza backend AI).",
    `Obiettivo letto: ${goal}.`,
    `Allenamento consigliato: ${days} giorni/settimana con ${equipment}.`,
    "",
    "Piano base (4 settimane):",
    "- Giorno A: spinta + core (4 esercizi, 3-4 serie, RPE 7-8)",
    "- Giorno B: tirata + posterior chain",
    "- Giorno C: gambe + conditioning",
    days >= 4 ? "- Giorno D: full body tecnico + mobilita" : "- Extra: 2 camminate veloci da 30 minuti",
    "",
    `Nutrizione (${dietStyle}): parti da circa ${kcalHint} kcal e regola ogni 2 settimane.`,
    "- Proteine: 1.8-2.2 g/kg peso",
    "- Grassi: 0.7-1.0 g/kg peso",
    "- Carboidrati: calorie rimanenti, piu alti nei giorni di allenamento",
    "",
    "3 ricette rapide:",
    "- Bowl proteica (riso, fonte proteica, verdure, olio EVO)",
    "- Omelette alta proteina + pane integrale + frutta",
    "- Yogurt greco/alternativa vegetale + avena + frutti rossi",
    "",
    `Richiesta ricevuta: \"${userText}\"`,
    "Se vuoi la risposta AI reale su Pages, imposta un backend pubblico in config.js (apiBaseUrl)."
  ].join("\n");
}

async function sendToCoach(text) {
  addMessage("user", text);
  history.push({ role: "user", content: text });

  coachState.textContent = "Coach in elaborazione...";
  setChatEnabled(false);

  try {
    if (IS_GITHUB_PAGES && !API_BASE_URL) {
      const demoReply = buildDemoReply(text, profile || {});
      addMessage("assistant", demoReply);
      history.push({ role: "assistant", content: demoReply });
      speak(demoReply.slice(0, 280));
      coachState.textContent = "Coach demo attivo";
      return;
    }

    const response = await fetch(buildApiUrl("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        message: text,
        history
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Errore durante la richiesta");
    }

    addMessage("assistant", data.reply);
    history.push({ role: "assistant", content: data.reply });
    speak(data.reply.slice(0, 280));
    coachState.textContent = "Coach attivo";
  } catch (error) {
    addMessage("error", error.message);
    coachState.textContent = "Errore";
  } finally {
    setChatEnabled(true);
    chatInput.focus();
  }
}

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);

  profile = Object.fromEntries(formData.entries());
  profile.age = Number(profile.age);
  profile.weightKg = Number(profile.weightKg);
  profile.heightCm = Number(profile.heightCm);
  profile.trainingDays = Number(profile.trainingDays);

  const { bmi, bmr } = calcMetrics(
    profile.weightKg,
    profile.heightCm,
    profile.age,
    profile.sex
  );

  metricsBox.classList.remove("hidden");
  metricsBox.innerHTML = `
    <strong>Metriche iniziali</strong><br>
    BMI stimato: <strong>${bmi.toFixed(1)}</strong><br>
    Metabolismo basale (BMR): <strong>${Math.round(bmr)} kcal</strong><br>
    <small>Valori indicativi, non medici.</small>
  `;

  coachState.textContent = IS_GITHUB_PAGES && !API_BASE_URL ? "Coach demo attivo" : "Coach attivo";
  setChatEnabled(true);

  chatWindow.innerHTML = "";
  history = [];

  const welcome = [
    `Ciao ${profile.name || "campione"}, ottimo inizio.`,
    "Sono pronto a costruire il tuo piano per diventare muscoloso e magro.",
    "Scrivi ad esempio: 'Fammi un piano allenamento + ricette per 7 giorni'."
  ].join(" ");

  addMessage("assistant", welcome);
  history.push({ role: "assistant", content: welcome });
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  await sendToCoach(text);
});

voiceBtn.addEventListener("click", () => {
  if (!recognition) {
    addMessage("error", "Riconoscimento vocale non supportato in questo browser.");
    return;
  }

  recognition.start();
  coachState.textContent = "Ascolto in corso...";
});

if (recognition) {
  recognition.addEventListener("result", async (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript) {
      await sendToCoach(transcript);
    }
  });

  recognition.addEventListener("error", () => {
    coachState.textContent = "Errore microfono";
  });

  recognition.addEventListener("end", () => {
    if (profile) {
      coachState.textContent = IS_GITHUB_PAGES && !API_BASE_URL ? "Coach demo attivo" : "Coach attivo";
    }
  });
}

setChatEnabled(false);
addMessage(
  "assistant",
  IS_GITHUB_PAGES && !API_BASE_URL
    ? "Compila il profilo: su GitHub Pages stai usando la modalita demo. Per AI reale, collega un backend in config.js."
    : "Compila il profilo qui a sinistra. Appena pronto, iniziamo con un piano personalizzato serio."
);
