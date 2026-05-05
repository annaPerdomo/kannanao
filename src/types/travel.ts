/** Travel Mode — types for complete beginner Japanese travel features */

// ─── Scenario Simulator ───────────────────────────────────────────

export type ScenarioCategory =
  | 'restaurant'
  | 'convenience_store'
  | 'train'
  | 'hotel'
  | 'shopping'
  | 'emergency'
  | 'greeting'
  | 'taxi';

export interface ScenarioChoice {
  id: string;
  /** What the user wants to say/do (English) */
  intent: string;
  /** The Japanese phrase to use */
  japanese: string;
  /** Romaji pronunciation */
  romaji: string;
  /** Cultural appropriateness: good, okay, avoid */
  tone: 'good' | 'okay' | 'avoid';
}

export interface ScenarioStep {
  id: string;
  /** What the Japanese person says */
  npcJapanese: string;
  /** Romaji of NPC line */
  npcRomaji: string;
  /** English translation of NPC line */
  npcEnglish: string;
  /** Context: what's happening in the scene */
  context: string;
  /** Cultural tip for this moment */
  culturalTip?: string;
  /** Choices the user can make */
  choices: ScenarioChoice[];
}

export interface ScenarioResult {
  /** How it went: success, awkward, misunderstanding */
  outcome: 'success' | 'awkward' | 'misunderstanding';
  /** What happened as a result */
  description: string;
  /** Phrases worth remembering from this scenario */
  keyPhrases: PhraseLearned[];
}

export interface PhraseLearned {
  japanese: string;
  romaji: string;
  english: string;
}

export interface Scenario {
  id: string;
  category: ScenarioCategory;
  title: string;
  description: string;
  /** Emoji icon for the scenario */
  icon: string;
  /** Difficulty 1-3 */
  difficulty: number;
  /** The opening scene context */
  setting: string;
}

// ─── Show Cards ───────────────────────────────────────────────────

export type ShowCardCategory =
  | 'allergies'
  | 'directions'
  | 'help'
  | 'preferences'
  | 'medical'
  | 'communication'
  | 'custom';

export interface ShowCard {
  id: string;
  category: ShowCardCategory;
  /** English (for the user to read) */
  english: string;
  /** Japanese (large, for showing to Japanese person) */
  japanese: string;
  /** Romaji pronunciation guide */
  romaji: string;
  /** When/where to use this card */
  situation: string;
  /** Icon/emoji */
  icon: string;
  /** Whether this is user-generated via AI */
  isCustom: boolean;
}

// ─── Photo Decoder ────────────────────────────────────────────────

export interface PhotoDecodeResult {
  /** Detected Japanese text from the image */
  detectedText: string;
  /** English translation */
  translation: string;
  /** Romaji pronunciation */
  romaji: string;
  /** What this text is (sign, menu item, warning, etc.) */
  textType: string;
  /** Cultural context about what this means in practice */
  culturalContext: string;
  /** Useful phrases related to what you're looking at */
  relatedPhrases: PhraseLearned[];
}

// ─── Survival Phrases ─────────────────────────────────────────────

export type PhraseSituation =
  | 'greetings'
  | 'restaurant'
  | 'shopping'
  | 'transport'
  | 'hotel'
  | 'emergency'
  | 'polite'
  | 'numbers'
  | 'directions';

export interface SurvivalPhrase {
  id: string;
  situation: PhraseSituation;
  /** English meaning */
  english: string;
  /** Japanese text (hiragana/katakana/kanji) */
  japanese: string;
  /** Romaji pronunciation */
  romaji: string;
  /** Literal word-by-word breakdown */
  breakdown: string;
  /** When to actually use this */
  whenToUse: string;
  /** Cultural note */
  culturalNote?: string;
  /** Formality: casual, polite, very_polite */
  formality: 'casual' | 'polite' | 'very_polite';
  /** Difficulty 1-3 */
  difficulty: number;
}

// ─── Culture Cards ────────────────────────────────────────────────

export type CultureTopic =
  | 'trains'
  | 'restaurants'
  | 'onsen'
  | 'shrines'
  | 'shopping'
  | 'general'
  | 'gestures'
  | 'taboos';

export interface CultureCard {
  id: string;
  topic: CultureTopic;
  /** Title of the cultural point */
  title: string;
  /** Icon/emoji */
  icon: string;
  /** The do/don't rule */
  rule: string;
  /** Why this matters */
  explanation: string;
  /** Related useful phrases */
  phrases: PhraseLearned[];
  /** Importance: essential, recommended, nice_to_know */
  importance: 'essential' | 'recommended' | 'nice_to_know';
}

// ─── AI Generation Request/Response ──────────────────────────────

export interface ScenarioGenerateRequest {
  category: ScenarioCategory;
  /** Optional custom situation description */
  customSituation?: string;
}

export interface ScenarioStepRequest {
  scenarioId: string;
  category: ScenarioCategory;
  setting: string;
  /** History of choices made so far */
  history: Array<{
    npcLine: string;
    chosenResponse: string;
  }>;
}

export interface ShowCardGenerateRequest {
  /** What the user wants to communicate */
  message: string;
}

export interface PhotoDecodeRequest {
  /** Base64-encoded image data */
  imageBase64: string;
}

export interface PhraseGenerateRequest {
  situation: PhraseSituation;
  /** Optional specific sub-context */
  specificContext?: string;
}
