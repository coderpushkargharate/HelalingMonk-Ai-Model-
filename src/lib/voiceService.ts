export interface VoiceMessage {
  text: string;
  urgent?: boolean;
  lang?: 'en' | 'hi'; // Support English and Hindi
}

let synth: SpeechSynthesis | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voices: SpeechSynthesisVoice[] = [];
let preferredVoice: SpeechSynthesisVoice | null = null;

// Names that indicate a female English voice across common platforms
// (Windows/Chrome/macOS/Android). We match these to keep the coach's voice a
// consistent, friendly female English voice.
const FEMALE_EN_HINTS = [
  'female',
  'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'susan', 'allison', 'ava', 'nora',
  'zira', 'aria', 'jenny', 'michelle', 'sonia', 'libby', 'hazel', 'catherine', 'linda',
  'google uk english female', 'google us english',
];

function loadVoices(): void {
  if (!synth) return;
  voices = synth.getVoices();
  const en = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  // First a name that looks female, otherwise any English voice.
  preferredVoice =
    FEMALE_EN_HINTS.map((hint) => en.find((v) => v.name.toLowerCase().includes(hint))).find(
      (v): v is SpeechSynthesisVoice => Boolean(v)
    ) ??
    en[0] ??
    null;
}

export function initializeVoice(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    synth = window.speechSynthesis;
    loadVoices();
    // Voice list often loads asynchronously; refresh when it becomes available.
    synth.onvoiceschanged = loadVoices;
  }
}

export function speak(message: VoiceMessage): Promise<void> {
  return new Promise((resolve) => {
    if (!synth) {
      initializeVoice();
    }

    if (!synth) {
      console.warn('Speech synthesis not available');
      resolve();
      return;
    }

    synth.cancel();

    currentUtterance = new SpeechSynthesisUtterance(message.text);
    currentUtterance.rate = 0.95;
    // A slightly higher pitch keeps a warm, feminine tone on generic voices.
    currentUtterance.pitch = 1.1;
    currentUtterance.volume = 1.0;

    // The coach always speaks in a female English voice. Pick it lazily in case
    // the voice list wasn't ready at init time.
    if (!preferredVoice) loadVoices();
    if (preferredVoice) currentUtterance.voice = preferredVoice;
    currentUtterance.lang = preferredVoice?.lang || 'en-US';

    currentUtterance.onend = () => {
      resolve();
    };

    currentUtterance.onerror = () => {
      resolve();
    };

    synth.speak(currentUtterance);
  });
}

export function stopSpeech(): void {
  if (synth) {
    synth.cancel();
  }
}

export async function speakSequence(messages: VoiceMessage[]): Promise<void> {
  for (const message of messages) {
    await speak(message);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export function isSpeakingSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Hindi translations for all messages
export const HINDI_MESSAGES = {
  // General
  welcomeAssessment: 'हीलिंगमंक एआई आंदोलन मूल्यांकन में आपका स्वागत है।',
  initialPostureComplete: 'आपका प्रारंभिक मुद्रा मूल्यांकन पूरा हो गया है।',
  painIdentification: 'अब, आइए किसी भी दर्द या असुविधा वाले क्षेत्रों की पहचान करें।',
  selectPainAreas: 'कृपया अपने शरीर के उन क्षेत्रों पर क्लिक करें जहां आप दर्द महसूस करते हैं।',

  // Pain areas
  neckPain: 'गर्दन का दर्द',
  shoulderPain: 'कंधे का दर्द',
  lowerBackPain: 'निचली पीठ का दर्द',
  kneePain: 'घुटने का दर्द',
  hipPain: 'कूल्हे का दर्द',

  // Pain selected/deselected
  areaSelected: 'चयनित',
  areaDeselected: 'हटाया गया',

  // Multi-position guidance
  continuousAssessment: 'बहुत अच्छा। हम अब विस्तृत मूल्यांकन शुरू करेंगे।',
  followInstructions: 'कृपया मेरे निर्देशों का सावधानीपूर्वक पालन करें।',
  willAssess: 'हम अब आपका विस्तृत विश्लेषण करेंगे।',

  // Neck positions
  neckNeutral: 'कृपया सीधे आगे देखें और अपनी गर्दन को आराम दें। अपने कंधों को नीचे रखें।',
  neckTurnLeft: 'अब धीरे-धीरे अपनी गर्दन को बाईं ओर घुमाएं। जब आप हल्का तनाव महसूस करें तो रुकें।',
  neckTurnRight: 'अपनी गर्दन को दाईं ओर घुमाएं। बाईं ओर से समान खिंचाव करने का प्रयास करें।',
  neckTiltForward: 'धीरे-धीरे अपनी गर्दन को आगे की ओर झुकाएं। गुरुत्वाकर्षण को काम करने दें, दबाएं नहीं।',

  // Shoulder positions
  shoulderNeutral: 'अपनी बाहों को अपने पक्षों में आराम से रखें। अपने कंधों को पीछे और नीचे रखें।',
  shoulderRaiseRight: 'धीरे-धीरे अपनी दाहिनी बाहु को कंधे के स्तर तक उठाएं। इसे वहां पकड़ें।',
  shoulderOverheadRight: 'अपनी दाहिनी बाहु को अपने सिर के ऊपर उठाना जारी रखें। यदि दर्द हो तो रुकें।',
  shoulderRaiseLeft: 'अब अपनी बाईं बाहु को कंधे के स्तर तक उठाएं। अपनी दाहिनी बाहु की ऊंचाई से मेल खाएं।',

  // Back positions
  backNeutral: 'सीधे खड़े हों और अपने पैरों को कंधे की चौड़ाई से अलग रखें। तटस्थ रीढ़ बनाए रखें।',
  backForwardBend: 'धीरे-धीरे कमर पर झुकें। अपनी बाहों को लटकने दें। किसी भी दर्द पर रुकें।',
  backBackwardBend: 'धीरे-धीरे अपनी पीठ को पीछे की ओर झुकाएं। अपनी निचली पीठ को अपने हाथों से सहारें।',
  backRotation: 'अपने धड़ को दाईं ओर घुमाएं। स्थिति को पकड़ें और किसी भी बेचैनी को नोट करें।',

  // Knee positions
  kneeStanding: 'अपने पैरों को कंधे की चौड़ाई से अलग रखकर खड़े हों। वजन को समान रूप से वितरित करें।',
  kneePartialSquat: 'धीरे-धीरे अपने घुटनों को आधे नीचे झुकाएं। यदि दर्द हो तो रुकें।',
  kneeDeepSquat: 'स्क्वाट स्थिति में गहरा जाएं। केवल जहां तक आरामदायक हो वहां तक जाएं।',
  kneeSingleLeg: 'अपना बाया पैर उठाएं और अपने दाहिने पैर पर संतुलन बनाएं।',

  // Hip positions
  hipNeutral: 'अपने पैरों को कंधे की चौड़ाई से अलग रखकर सामान्य मुद्रा में खड़े हों।',
  hipSingleLegLeft: 'अपना दाहिना पैर उठाएं और अपने बाएं पैर पर संतुलन बनाएं।',
  hipSingleLegRight: 'अपना बाया पैर उठाएं और अपने दाहिने पैर पर संतुलन बनाएं।',
  hipCrossBodyStretch: 'एक घुटने को अपने विपरीत कंधे की ओर लाएं। इस खिंचाव को पकड़ें।',

  // Countdown and capture
  getReady: 'तैयार हो जाइए',
  threeSeconds: 'तीन',
  twoSeconds: 'दो',
  oneSecond: 'एक',
  startCapture: 'शुरू करें',
  capturing: 'कैप्चरिंग',
  analyzingPose: 'मुद्रा का विश्लेषण कर रहे हैं',
  framesCaptured: 'फ़्रेम कैप्चर किए गए',

  // Results
  assessmentComplete: 'बहुत अच्छा! मूल्यांकन पूरा हो गया है।',
  generatingReport: 'आपकी विस्तृत रिपोर्ट तैयार की जा रही है।',
  recommendedPrograms: 'आपके लिए अनुशंसित कार्यक्रम।',
};
