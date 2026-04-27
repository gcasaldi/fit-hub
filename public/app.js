const profileForm = document.getElementById("profile-form");
const metricsBox = document.getElementById("metrics");
const coachState = document.getElementById("coach-state");
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");
const msgTemplate = document.getElementById("msg-template");

let profile = null;
let history = [];
const coachMemory = {
  physiqueTarget: "",
  askedPhysiqueTarget: false,
  trainingMinutes: 60
};

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

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function workoutTemplate(userProfile) {
  const days = Number(userProfile.trainingDays) || 3;
  const equipment = userProfile.equipment || "Corpo libero";

  if (days <= 3) {
    return [
      "- Giorno A: Spinta + core",
      "- Giorno B: Trazione + catena posteriore",
      "- Giorno C: Gambe + conditioning"
    ].join("\n");
  }

  if (days === 4) {
    return [
      "- Giorno 1: Upper (forza)",
      "- Giorno 2: Lower (forza)",
      "- Giorno 3: Upper (ipertrofia)",
      "- Giorno 4: Lower (ipertrofia + HIIT breve)"
    ].join("\n");
  }

  return [
    "- Giorno 1: Push",
    "- Giorno 2: Pull",
    "- Giorno 3: Legs",
    "- Giorno 4: Upper tecnico",
    "- Giorno 5: Lower + sprint brevi"
  ].join("\n");
}

function mealIdeas(userProfile) {
  const dietStyle = userProfile.dietStyle || "Onnivoro";
  const allergies = userProfile.allergies || "nessuna";

  return [
    `Stile: ${dietStyle} | Attenzione a: ${allergies}.`,
    "- Colazione: yogurt greco (o soia) + avena + frutti rossi + semi",
    "- Pranzo: bowl con riso, proteine magre/legumi, verdure, olio EVO",
    "- Cena: fonte proteica + patate/riso + verdure cotte + frutta",
    "- Snack: frutto + frutta secca o shake proteico"
  ].join("\n");
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
        "Puoi rispondere ad esempio: 'definito e asciutto', 'muscoloso e pieno' oppure 'atletico in ricomposizione'."
      ].join("\n");
    }

    coachMemory.physiqueTarget = detected;
    return [
      `Perfetto, obiettivo registrato: ${coachMemory.physiqueTarget}.`,
      "Ora posso personalizzare piano allenamento e ricette.",
      "Dimmi se preferisci prima: allenamento, nutrizione o piano settimanale completo."
    ].join("\n");
  }

  const wantsWorkout =
    clean.includes("allen") || clean.includes("scheda") || clean.includes("workout") || clean.includes("eserciz");
  const wantsFood =
    clean.includes("ricett") || clean.includes("nutriz") || clean.includes("dieta") || clean.includes("pasto");
  const wantsFullPlan = clean.includes("piano") || clean.includes("settimana") || clean.includes("completo");

  const kcal = getCaloriesTarget(userProfile);
  const proteins = Math.round((Number(userProfile.weightKg) || 70) * 2);

  return [
    `Obiettivo fisico: ${coachMemory.physiqueTarget}`,
    `Calorie target iniziali: circa ${kcal} kcal`,
    `Proteine giornaliere: circa ${proteins} g`,
    "",
    wantsWorkout || wantsFullPlan ? "Allenamento:" : "Allenamento (base):",
    workoutTemplate(userProfile),
    "",
    wantsFood || wantsFullPlan ? "Nutrizione e ricette:" : "Nutrizione (base):",
    mealIdeas(userProfile),
    "",
    "Recupero:",
    "- Sonno: 7.5-9 ore",
    "- Passi: 8k-10k al giorno",
    "- Progressione: aumenta gradualmente carichi o ripetizioni ogni 1-2 settimane",
    "",
    `Richiesta interpretata: \"${userMessage}\"`,
    "Se vuoi, nel prossimo messaggio ti preparo un piano preciso giorno per giorno."
  ].join("\n");
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

setChatEnabled(false);
addMessage(
  "assistant",
  "Compila il profilo qui a sinistra. Ti chiedero subito che fisico vuoi raggiungere e poi costruiremo il piano."
);
