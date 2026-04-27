const profileForm = document.getElementById("profile-form");
const metricsBox = document.getElementById("metrics");
const coachState = document.getElementById("coach-state");
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");
const msgTemplate = document.getElementById("msg-template");
const authForm = document.getElementById("auth-form");
const authUsername = document.getElementById("auth-username");
const authPassword = document.getElementById("auth-password");
const registerBtn = document.getElementById("register-btn");
const logoutBtn = document.getElementById("logout-btn");
const authStatus = document.getElementById("auth-status");

let profile = null;
let history = [];
const coachMemory = {
  physiqueTarget: "",
  askedPhysiqueTarget: false,
  trainingMinutes: 60
};
let currentUser = null;

const USERS_STORAGE_KEY = "fitHubUsersV1";
const CURRENT_USER_KEY = "fitHubCurrentUserV1";

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
  const canUse = Boolean(currentUser) && Boolean(profile) && enabled;
  chatInput.disabled = !canUse;
  sendBtn.disabled = !canUse;
  voiceBtn.disabled = !canUse || !recognition;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "it-IT";
  utter.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashPassword(raw) {
  let h = 5381;
  const value = String(raw || "");
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 33) ^ value.charCodeAt(i);
  }
  return String(h >>> 0);
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeUsers(data) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data));
}

function saveCurrentUserData() {
  if (!currentUser) return;
  const users = readUsers();
  const record = users[currentUser];
  if (!record) return;

  record.profile = profile;
  record.history = history;
  record.coachMemory = { ...coachMemory };
  users[currentUser] = record;
  writeUsers(users);
}

function setProfileFormValues(nextProfile) {
  const mapped = nextProfile || {};
  const entries = Object.entries(mapped);
  const fields = profileForm.elements;

  for (const [key, value] of entries) {
    if (!fields[key]) continue;
    fields[key].value = value;
  }
}

function renderMetricsForProfile(dataProfile) {
  const p = dataProfile;
  if (!p || !p.age || !p.weightKg || !p.heightCm || !p.sex) {
    metricsBox.classList.add("hidden");
    return;
  }

  const { bmi, bmr } = calcMetrics(
    Number(p.weightKg),
    Number(p.heightCm),
    Number(p.age),
    p.sex
  );

  metricsBox.classList.remove("hidden");
  metricsBox.innerHTML = `
    <strong>Metriche iniziali</strong><br>
    BMI stimato: <strong>${bmi.toFixed(1)}</strong><br>
    Metabolismo basale (BMR): <strong>${Math.round(bmr)} kcal</strong><br>
    <small>Valori indicativi, non medici.</small>
  `;
}

function restoreHistory(messages) {
  chatWindow.innerHTML = "";
  const safeMessages = Array.isArray(messages) ? messages : [];

  for (const item of safeMessages) {
    const role = item.role === "assistant" ? "assistant" : "user";
    addMessage(role, String(item.content || ""));
  }
}

function applyUserSession(username) {
  const users = readUsers();
  const record = users[username];

  if (!record) return;

  currentUser = username;
  localStorage.setItem(CURRENT_USER_KEY, username);
  authStatus.textContent = `Accesso attivo: ${username}`;
  logoutBtn.disabled = false;

  profile = record.profile || null;
  history = Array.isArray(record.history) ? record.history : [];
  coachMemory.physiqueTarget = record.coachMemory?.physiqueTarget || "";
  coachMemory.askedPhysiqueTarget = Boolean(record.coachMemory?.askedPhysiqueTarget);
  coachMemory.trainingMinutes = Number(record.coachMemory?.trainingMinutes) || 60;

  setProfileFormValues(profile || {});
  renderMetricsForProfile(profile);
  restoreHistory(history);

  if (!profile) {
    setChatEnabled(false);
    coachState.textContent = "Completa il profilo";
    addMessage("assistant", "Accesso riuscito. Completa il profilo per ricevere il piano completo.");
    return;
  }

  setChatEnabled(true);
  coachState.textContent = "Coach attivo";
  if (history.length === 0) {
    addMessage("assistant", "Bentornato. Che tipo di fisico vuoi raggiungere? Ti preparo subito un piano completo.");
  }
}

function clearSession() {
  currentUser = null;
  localStorage.removeItem(CURRENT_USER_KEY);
  authStatus.textContent = "Non autenticato";
  logoutBtn.disabled = true;
  coachState.textContent = "In attesa del tuo profilo";
  profile = null;
  history = [];
  coachMemory.physiqueTarget = "";
  coachMemory.askedPhysiqueTarget = false;
  coachMemory.trainingMinutes = 60;
  profileForm.reset();
  metricsBox.classList.add("hidden");
  chatWindow.innerHTML = "";
  setChatEnabled(false);
  addMessage(
    "assistant",
    "Hai effettuato il logout. Accedi o registrati: poi il coach ricordera tutto il tuo percorso."
  );
}

function detectPhysiqueTarget(text) {
  const t = normalizeText(text);
  if (
    t.includes("magro") ||
    t.includes("definito") ||
    t.includes("asciutto") ||
    t.includes("tirato")
  ) {
    return "definito e asciutto";
  }

  if (
    t.includes("muscoloso") ||
    t.includes("massa") ||
    t.includes("grosso") ||
    t.includes("voluminoso")
  ) {
    return "muscoloso e pieno";
  }

  if (
    t.includes("atletico") ||
    t.includes("ricompos") ||
    t.includes("lean") ||
    t.includes("fitness model")
  ) {
    return "atletico in ricomposizione";
  }

  return "";
}

function getCaloriesTarget(userProfile) {
  const weight = Number(userProfile.weightKg) || 70;
  const days = Number(userProfile.trainingDays) || 3;
  const activityFactor = days >= 5 ? 1.55 : days >= 3 ? 1.45 : 1.35;
  const bmrBase = 10 * weight + 6.25 * (Number(userProfile.heightCm) || 170) - 5 * (Number(userProfile.age) || 30);
  const bmr = userProfile.sex === "Donna" ? bmrBase - 161 : bmrBase + 5;
  const tdee = Math.round(bmr * activityFactor);

  if (coachMemory.physiqueTarget.includes("definito")) return tdee - 250;
  if (coachMemory.physiqueTarget.includes("muscoloso")) return tdee + 150;
  return tdee - 100;
}

function getMacroTargets(userProfile, kcal) {
  const weight = Number(userProfile.weightKg) || 70;
  const proteinG = Math.round(weight * 2);
  const fatG = Math.round(weight * 0.8);
  const carbsG = Math.round((kcal - proteinG * 4 - fatG * 9) / 4);
  return { proteinG, fatG, carbsG };
}

function workoutTemplate(userProfile) {
  const days = Number(userProfile.trainingDays) || 3;
  const equipment = userProfile.equipment || "Corpo libero";

  if (days <= 3) {
    return [
      `Attrezzatura considerata: ${equipment}`,
      "- Giorno A: Spinta + core",
      "  1) Press principale 4x6-8",
      "  2) Spinta secondaria 3x8-10",
      "  3) Alzate/spalle 3x12-15",
      "  4) Tricipiti 3x10-12",
      "  5) Core 3x45-60 sec",
      "- Giorno B: Trazione + catena posteriore",
      "  1) Trazioni/rematore 4x6-8",
      "  2) Hip hinge (RDL/stacco) 4x6-8",
      "  3) Tirata secondaria 3x8-12",
      "  4) Bicipiti 3x10-12",
      "  5) Core antirotazione 3x10",
      "- Giorno C: Gambe + conditioning",
      "  1) Squat pattern 4x6-8",
      "  2) Affondi 3x10/10",
      "  3) Leg curl o hip thrust 3x10-12",
      "  4) Polpacci 3x12-15",
      "  5) Conditioning 10-15 min"
    ].join("\n");
  }

  if (days === 4) {
    return [
      `Attrezzatura considerata: ${equipment}`,
      "- Giorno 1: Upper (forza)",
      "- Giorno 2: Lower (forza)",
      "- Giorno 3: Upper (ipertrofia)",
      "- Giorno 4: Lower (ipertrofia + HIIT breve)",
      "Progressione: quando completi il top range in tutte le serie, aumenta 2-5%."
    ].join("\n");
  }

  return [
    `Attrezzatura considerata: ${equipment}`,
    "- Giorno 1: Push",
    "- Giorno 2: Pull",
    "- Giorno 3: Legs",
    "- Giorno 4: Upper tecnico",
    "- Giorno 5: Lower + sprint brevi",
    "- Giorno 6 opzionale: mobilita attiva + core",
    "Progressione: alterna settimana volume e settimana intensita."
  ].join("\n");
}

function nutritionTemplate(userProfile, kcal, macroTargets) {
  const dietStyle = userProfile.dietStyle || "Onnivoro";
  const allergies = userProfile.allergies || "nessuna";

  return [
    `Stile alimentare: ${dietStyle}`,
    `Allergie/intolleranze: ${allergies}`,
    `Calorie: ${kcal} kcal`,
    `Macro target: Proteine ${macroTargets.proteinG}g, Grassi ${macroTargets.fatG}g, Carboidrati ${macroTargets.carbsG}g`,
    "- Pre-allenamento: carboidrati facili + fonte proteica",
    "- Post-allenamento: proteine 25-40g + carboidrati",
    "- Idratazione: 30-40 ml/kg peso + extra se sudi",
    "- Fibre: 25-35g al giorno"
  ].join("\n");
}

function mealIdeas(userProfile) {
  const dietStyle = userProfile.dietStyle || "Onnivoro";

  if (dietStyle === "Vegano") {
    return [
      "- Colazione: porridge + proteine vegetali + frutti rossi",
      "- Pranzo: quinoa + tofu/tempeh + verdure + olio EVO",
      "- Cena: legumi + patate + verdure + semi",
      "- Snack: hummus + crackers integrali"
    ].join("\n");
  }

  if (dietStyle === "Vegetariano") {
    return [
      "- Colazione: yogurt greco/skyr + avena + frutta",
      "- Pranzo: riso + uova o legumi + verdure",
      "- Cena: fiocchi di latte/tofu + pane integrale + contorno",
      "- Snack: frutta + mix frutta secca"
    ].join("\n");
  }

  return [
    "- Colazione: yogurt greco + avena + banana + cannella",
    "- Pranzo: riso basmati + pollo/tacchino + verdure",
    "- Cena: pesce/uova + patate + insalata + olio EVO",
    "- Snack: whey o skyr + frutta"
  ].join("\n");
}

function weeklyTemplate(userProfile) {
  const days = Number(userProfile.trainingDays) || 3;
  return [
    "Lun: workout",
    "Mar: passi 8k-10k + mobilita",
    "Mer: workout",
    "Gio: recupero attivo",
    "Ven: workout",
    days >= 4 ? "Sab: workout leggero/tecnico" : "Sab: camminata lunga o bici leggera",
    "Dom: check peso, misure e pianificazione settimana"
  ].join("\n");
}

function adjustmentRules() {
  return [
    "- Se il peso non cambia per 14 giorni: -120 kcal (fase definizione) o +120 kcal (fase massa)",
    "- Se forza crolla: aumenta carboidrati nei giorni allenamento",
    "- Se fame alta serale: aumenta volume verdure e proteine nel pasto precedente",
    "- Deload ogni 6-8 settimane (volume -40%)"
  ].join("\n");
}

function buildFullResponse(userMessage, userProfile) {
  const kcal = getCaloriesTarget(userProfile);
  const macroTargets = getMacroTargets(userProfile, kcal);

  return [
    `Obiettivo fisico attivo: ${coachMemory.physiqueTarget}`,
    "",
    "ANALISI RAPIDA",
    `- Profilo: ${userProfile.trainingLevel || "N/D"}, ${userProfile.trainingDays || "N/D"} giorni/settimana, ${userProfile.equipment || "N/D"}`,
    "- Focus: costruire massa muscolare mantenendo o riducendo il grasso in modo sostenibile",
    "",
    "ALLENAMENTO (DETTAGLIATO)",
    workoutTemplate(userProfile),
    "",
    "NUTRIZIONE (DETTAGLIATA)",
    nutritionTemplate(userProfile, kcal, macroTargets),
    "",
    "RICETTE/PASTI CONSIGLIATI",
    mealIdeas(userProfile),
    "",
    "PIANO SETTIMANALE COMPLETO",
    weeklyTemplate(userProfile),
    "",
    "MONITORAGGIO E AGGIUSTAMENTI",
    adjustmentRules(),
    "",
    "RECUPERO",
    "- Sonno: 7.5-9 ore",
    "- Passi: 8k-10k giornalieri",
    "- Stress: 5-10 minuti respirazione a fine giornata",
    "",
    `Richiesta utente: \"${userMessage}\"`,
    "Se vuoi, nel prossimo messaggio ti genero la versione giorno-per-giorno con serie, ripetizioni e lista spesa."
  ].join("\n");
}

function parseCoachPreferences(cleanText) {
  const wantsWorkout =
    cleanText.includes("allen") || cleanText.includes("scheda") || cleanText.includes("workout") || cleanText.includes("eserciz");
  const wantsFood =
    cleanText.includes("ricett") || cleanText.includes("nutriz") || cleanText.includes("dieta") || cleanText.includes("pasto");
  const wantsFullPlan = cleanText.includes("piano") || cleanText.includes("settimana") || cleanText.includes("completo");
  return { wantsWorkout, wantsFood, wantsFullPlan };
}

function buildCoachReply(userMessage, userProfile) {
  const clean = normalizeText(userMessage);

  if (!coachMemory.physiqueTarget) {
    const detected = detectPhysiqueTarget(clean);
    if (!detected) {
      coachMemory.askedPhysiqueTarget = true;
      return [
        "Prima domanda fondamentale:",
        "Che tipo di fisico vuoi raggiungere?",
        "Opzioni utili: definito e asciutto, muscoloso e pieno, atletico in ricomposizione.",
        "Rispondi con una di queste (o con la tua descrizione)."
      ].join("\n");
    }

    coachMemory.physiqueTarget = detected;
    return [
      `Perfetto, obiettivo salvato: ${coachMemory.physiqueTarget}.`,
      "Da ora in poi usero questo target in tutte le risposte.",
      "Scrivi pure: allenamento, nutrizione o piano completo."
    ].join("\n");
  }

  const maybeNewTarget = detectPhysiqueTarget(clean);
  if (maybeNewTarget && maybeNewTarget !== coachMemory.physiqueTarget) {
    coachMemory.physiqueTarget = maybeNewTarget;
  }

  const prefs = parseCoachPreferences(clean);
  const full = buildFullResponse(userMessage, userProfile);

  if (prefs.wantsFullPlan) return full;
  if (prefs.wantsWorkout || prefs.wantsFood) {
    return [
      "Ti rispondo in modo completo per aiutarti al massimo (allenamento + nutrizione + piano).",
      "",
      full
    ].join("\n");
  }

  return full;
}

async function sendToCoach(text) {
  addMessage("user", text);
  history.push({ role: "user", content: text });

  coachState.textContent = "Coach in elaborazione...";
  setChatEnabled(false);

  try {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const reply = buildCoachReply(text, profile || {});
    addMessage("assistant", reply);
    history.push({ role: "assistant", content: reply });
    saveCurrentUserData();
    speak(reply.slice(0, 280));
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
  if (!currentUser) {
    addMessage("error", "Per salvare i dati devi prima effettuare l'accesso.");
    return;
  }
  const formData = new FormData(profileForm);

  profile = Object.fromEntries(formData.entries());
  profile.age = Number(profile.age);
  profile.weightKg = Number(profile.weightKg);
  profile.heightCm = Number(profile.heightCm);
  profile.trainingDays = Number(profile.trainingDays);

  renderMetricsForProfile(profile);

  coachState.textContent = "Coach attivo";
  setChatEnabled(true);

  chatWindow.innerHTML = "";
  history = [];
  coachMemory.physiqueTarget = "";
  coachMemory.askedPhysiqueTarget = false;

  const welcome = [
    `Ciao ${profile.name || "campione"}, ottimo inizio.`,
    "Sono il tuo coach AI locale, creato dentro questa app (senza API chatbot esterne).",
    "Prima domanda: che tipo di fisico vuoi raggiungere?"
  ].join(" ");

  addMessage("assistant", welcome);
  history.push({ role: "assistant", content: welcome });
  saveCurrentUserData();
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
      coachState.textContent = "Coach attivo";
    }
  });
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = authUsername.value.trim().toLowerCase();
  const password = authPassword.value;

  if (!username || !password) {
    addMessage("error", "Inserisci username e password.");
    return;
  }

  const users = readUsers();
  const record = users[username];
  if (!record) {
    addMessage("error", "Utente non trovato. Premi Registrati per creare account.");
    return;
  }

  if (record.passwordHash !== hashPassword(password)) {
    addMessage("error", "Password non corretta.");
    return;
  }

  applyUserSession(username);
  addMessage("assistant", `Accesso riuscito, ${username}. Ho ripristinato i tuoi dati salvati.`);
});

registerBtn.addEventListener("click", () => {
  const username = authUsername.value.trim().toLowerCase();
  const password = authPassword.value;

  if (!username || !password) {
    addMessage("error", "Per registrarti inserisci username e password.");
    return;
  }

  if (username.length < 3 || password.length < 4) {
    addMessage("error", "Username minimo 3 caratteri, password minima 4 caratteri.");
    return;
  }

  const users = readUsers();
  if (users[username]) {
    addMessage("error", "Utente gia esistente. Esegui login.");
    return;
  }

  users[username] = {
    passwordHash: hashPassword(password),
    profile: null,
    history: [],
    coachMemory: {
      physiqueTarget: "",
      askedPhysiqueTarget: false,
      trainingMinutes: 60
    }
  };

  writeUsers(users);
  applyUserSession(username);
  addMessage("assistant", `Account creato con successo: ${username}. Ora compila il profilo, poi ti seguo passo passo.`);
});

logoutBtn.addEventListener("click", () => {
  clearSession();
});

const existingUser = localStorage.getItem(CURRENT_USER_KEY);
if (existingUser) {
  applyUserSession(existingUser);
}

setChatEnabled(false);
if (!existingUser) {
  addMessage(
    "assistant",
    "Inizia creando un accesso (registrati o accedi). Poi compila il profilo: ricordero tutto e ti preparero piani completi."
  );
}
