/**
 * DemoEngine — Simulates AI responses for demo mode.
 * This provides dynamic (not hardcoded) responses by using templates with variation.
 * Will be replaced by real LLM backend in production.
 */

const responseBank = {
  skeptical_trader: {
    userMessages: [
      "Mujhe koi interest nahi hai, already mera broker hai",
      "Aapka platform mujhe kya dega jo mere broker nahi de sakta?",
      "Hmm, thoda expensive lagta hai fees",
    ],
    aiResponses: [
      {
        text: "Samajh sakta hoon sir 🙏 Ek existing broker hona achi baat hai. Lekin kya aapne kabhi compare kiya hai ki aapka current broker kitna charge karta hai per trade? Bahut saare traders ko realize hota hai ki wo 3-5x zyada pay kar rahe hain unnecessarily.",
        thinkingSteps: [
          "Analyzing input...",
          "Language: Hinglish detected (60% Hindi, 40% English)",
          "Persona: Active Trader identified (broker mention)",
          "⚠️ Objection detected: COMPETITION (existing broker)",
          "Trust: 2.0 → 2.5 (+0.5, user engaged in conversation)",
          "Strategy: switching to competitive_comparison",
          "Reason: User has existing broker, needs differentiation",
          "Generating response in Hinglish, trader tone...",
        ],
        stateUpdate: {
          intent: 'cold', trustScore: 2.5, persona: 'trader', objection: 'competition',
          engagementScore: 3.0, strategy: 'competitive_comparison',
          strategyReason: 'User has existing broker — showing cost advantage',
          conversationStage: 'discovery', language: 'hinglish', leadScore: 2.5, leadClass: 'cold',
        },
      },
      {
        text: "Bahut accha sawaal! 💡 Dekho sir, 3 cheezein hain jo typically brokers miss karte hain: real-time AI alerts before market moves, zero brokerage on delivery, aur personalized portfolio insights jo aapke trading pattern ke hisaab se customize hoti hain. Aapka current broker ye provide karta hai?",
        thinkingSteps: [
          "Analyzing input...",
          "Intent shifting: User asking questions = engagement signal",
          "🧠 Memory recall: User mentioned having existing broker",
          "Trust: 2.5 → 4.0 (+1.5, user showing curiosity)",
          "Engagement: 3.0 → 5.5 — significant interest signal",
          "Strategy: maintaining competitive_comparison",
          "Generating value proposition in Hinglish...",
        ],
        stateUpdate: {
          intent: 'warm', trustScore: 4.0, persona: 'trader', objection: null,
          engagementScore: 5.5, strategy: 'competitive_comparison',
          strategyReason: 'User curious about differentiators — providing proof points',
          conversationStage: 'persuasion', language: 'hinglish', leadScore: 4.8, leadClass: 'warm',
          memoryTriggered: true,
        },
        memoryHighlight: true,
      },
      {
        text: "Sir, fees ki baat karun toh — aap abhi jo pay karte ho uska comparison dekhiye: agar aap monthly 50 trades karte ho, toh current broker pe lagbhag ₹5,000-8,000 jaata hoga. Humare platform pe same trades ka cost ₹500 se kam. Matlab ek saal mein almost ₹60,000-90,000 ki saving. Ye amount invest karo toh 3 saal mein almost ₹2.5L ka portfolio ban sakta hai 📊",
        thinkingSteps: [
          "Analyzing input...",
          "⚠️ Objection detected: PRICE (fees concern)",
          "Strategy: switching to roi_calculator_approach",
          "🧠 Memory recall: trader persona, high-frequency trading",
          "Calculating specific savings numbers...",
          "Trust: 4.0 → 5.5 (+1.5, user discussing money = trust signal)",
          "Lead score: 4.8 → 6.2 — approaching HOT territory",
          "Generating ROI-focused response with specific numbers...",
        ],
        stateUpdate: {
          intent: 'warm', trustScore: 5.5, persona: 'trader', objection: 'price',
          engagementScore: 7.0, strategy: 'roi_calculator_approach',
          strategyReason: 'Price objection → showing concrete ROI with numbers',
          conversationStage: 'persuasion', language: 'hinglish', leadScore: 6.2, leadClass: 'warm',
          memoryTriggered: true,
          memoryFacts: ['Active trader', 'Has existing broker', 'Price sensitive'],
        },
        memoryHighlight: true,
      },
    ],
  },
  busy_mfd: {
    userMessages: [
      "Abhi busy hoon, baad mein call karo",
      "Kitna time lagega ye samajhne mein?",
    ],
    aiResponses: [
      {
        text: "Bilkul sir, aapka time valuable hai 🙏 Sirf ek chhoti si baat — hum MFDs ke liye ek special program laye hain jo aapki AUM ko 40% tak grow kar sakta hai bina extra effort ke. Kya main aapko 2 minute mein summary bhej sakta hoon WhatsApp pe?",
        thinkingSteps: [
          "Analyzing input...",
          "Language: Hinglish detected",
          "Persona: MFD / Advisor (professional context)",
          "⚠️ Objection detected: TIMING (busy)",
          "Strategy: future_pacing_fomo — create value hook quickly",
          "Trust: 2.0 → 2.0 (no change, dismissive response)",
          "Generating concise value hook...",
        ],
        stateUpdate: {
          intent: 'cold', trustScore: 2.0, persona: 'MFD', objection: 'timing',
          engagementScore: 1.5, strategy: 'future_pacing_fomo',
          strategyReason: 'User busy — creating urgency with quick value hook',
          conversationStage: 'intro', language: 'hinglish', leadScore: 1.8, leadClass: 'cold',
        },
      },
      {
        text: "Sirf 90 seconds sir! 🎯 Main 3 key points cover karunga: 1) Kaise aapke existing clients ka retention 25% improve hoga, 2) Naye clients acquisition ka automated funnel, 3) Commission structure jo industry best hai. Ye teeno points mein se agar ek bhi aapke kaam ka na lage, toh I'll thank you for your time. Fair deal?",
        thinkingSteps: [
          "Analyzing input...",
          "Intent shift: User asking about time = micro-engagement",
          "Trust: 2.0 → 3.5 (+1.5, user didn't hang up)",
          "Engagement: 1.5 → 4.0 — question asked = positive signal",
          "Strategy: switching to pattern_interrupt",
          "Using '90 seconds' commitment technique",
          "Generating structured pitch for MFD persona...",
        ],
        stateUpdate: {
          intent: 'warm', trustScore: 3.5, persona: 'MFD', objection: null,
          engagementScore: 4.0, strategy: 'pattern_interrupt',
          strategyReason: 'Micro-engagement detected — using structured time-bound pitch',
          conversationStage: 'discovery', language: 'hinglish', leadScore: 3.8, leadClass: 'warm',
        },
      },
    ],
  },
  eager_beginner: {
    userMessages: [
      "Mujhe investing start karni hai lekin samajh nahi aata kaise",
      "Mutual funds safe hain kya? Kitna invest karu?",
      "Haan, mujhe start karna hai! Kya karu?",
    ],
    aiResponses: [
      {
        text: "Bohot accha decision hai! 🌟 Investing start karna ek important step hai aapki financial journey mein. Dekhiye, sabse pehle ye samajhna zaroori hai ki investing complicated nahi hai — bas systematically karna padta hai. Aapki monthly income roughly kitni hai? Usse hum ek personalized plan bana sakte hain.",
        thinkingSteps: [
          "Analyzing input...",
          "Language: Hinglish detected, simple vocabulary",
          "Persona: Beginner Investor identified",
          "No objection detected — pure curiosity",
          "Trust: 2.0 → 3.5 (+1.5, user voluntarily reached out)",
          "Strategy: educational_storytelling",
          "Generating simplified, encouraging response...",
        ],
        stateUpdate: {
          intent: 'warm', trustScore: 3.5, persona: 'beginner', objection: null,
          engagementScore: 5.0, strategy: 'educational_storytelling',
          strategyReason: 'New beginner investor — building confidence through education',
          conversationStage: 'discovery', language: 'hinglish', leadScore: 4.2, leadClass: 'warm',
        },
      },
      {
        text: "Bahut accha sawaal! 💪 Mutual funds ek safe aur proven tarika hai wealth build karne ka. Dekhiye, India ke top mutual funds ne last 10 years mein average 12-15% annual return diya hai. Aur SIP se toh aap ₹500 se bhi start kar sakte ho! Main recommend karunga ki aap apni monthly income ka 20% invest karo — agar ₹30,000 kamate ho toh ₹6,000/month se start karo. 5 saal mein ye ₹4.5 lakh se zyada ho sakta hai! 📈",
        thinkingSteps: [
          "Analyzing input...",
          "User asking about safety + amount = high engagement",
          "🧠 Memory recall: Beginner investor, first time",
          "Trust: 3.5 → 6.0 (+2.5, user sharing financial questions)",
          "Engagement: 5.0 → 7.5 — very high interest",
          "Lead score rising: 4.2 → 6.8",
          "Strategy: maintaining educational_storytelling with numbers",
          "Generating specific, actionable advice...",
        ],
        stateUpdate: {
          intent: 'warm', trustScore: 6.0, persona: 'beginner', objection: null,
          engagementScore: 7.5, strategy: 'educational_storytelling',
          strategyReason: 'High engagement — providing specific numbers and actionable advice',
          conversationStage: 'persuasion', language: 'hinglish', leadScore: 6.8, leadClass: 'warm',
          memoryFacts: ['Beginner investor', 'Interested in mutual funds', 'Safety conscious'],
        },
        memoryHighlight: true,
      },
      {
        text: "Shandar! 🔥 Aapka josh dekh ke bohot accha lag raha hai. Main abhi aapke liye ek personalized plan ready karta hoon. Humare senior advisor Rahul ji aapse connect honge — wo aapko step-by-step guide karenge, bilkul free mein! Unhe aapki details bhej raha hoon abhi. Aap next 15 min available ho?",
        thinkingSteps: [
          "Analyzing input...",
          "🔥 HIGH INTENT DETECTED — User ready to start!",
          "Trust: 6.0 → 8.5 (+2.5, commitment signal)",
          "Engagement: 7.5 → 9.5 — maximum engagement",
          "Lead classified: 🔥🔥 HOT",
          "Strategy: switching to direct_close_soft_ask",
          "🤝 Initiating RM Handoff process...",
          "Generating handoff summary for advisor...",
        ],
        stateUpdate: {
          intent: 'hot', trustScore: 8.5, persona: 'beginner', objection: null,
          engagementScore: 9.5, strategy: 'direct_close_soft_ask',
          strategyReason: 'User committed — transitioning to RM handoff',
          conversationStage: 'closing', language: 'hinglish', leadScore: 9.2, leadClass: 'hot',
          memoryFacts: ['Beginner investor', 'Interested in mutual funds', 'Safety conscious', 'Ready to start investing'],
        },
      },
    ],
  },
};

/**
 * Run a demo scenario step by step with delays.
 */
export async function runDemoScenario(scenarioId, { addMessage, setTyping, updateState, addThinkingStep, clearThinking }) {
  const scenario = responseBank[scenarioId];
  if (!scenario) return;

  for (let i = 0; i < scenario.userMessages.length; i++) {
    const userMsg = scenario.userMessages[i];
    const aiData = scenario.aiResponses[i];

    // Simulate user message
    await delay(800);
    addMessage({ role: 'user', text: userMsg, language: 'hinglish' });

    // Show AI typing
    await delay(500);
    setTyping(true);
    clearThinking();

    // Stream thinking steps
    for (const step of aiData.thinkingSteps) {
      await delay(350);
      addThinkingStep(step);
    }

    // Update state
    await delay(300);
    updateState(aiData.stateUpdate);

    // Show AI response
    await delay(400);
    setTyping(false);
    addMessage({
      role: 'ai',
      text: aiData.text,
      language: 'hinglish',
      memoryHighlight: aiData.memoryHighlight || false,
    });

    // Pause between exchanges
    if (i < scenario.userMessages.length - 1) {
      await delay(1500);
    }
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
