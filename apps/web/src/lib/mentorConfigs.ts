import general from "../../../../config/mentors/general.json";
import bible from "../../../../config/mentors/bible.json";
import chess from "../../../../config/mentors/chess.json";
import stock from "../../../../config/mentors/stock.json";

export interface MentorToolingConfig {
  tools?: string[];
  fallback?: string | null;
}

export interface MentorConfig {
  id: string;
  systemPrompt: string;
  styleGuidelines?: string[];
  tooling?: MentorToolingConfig;
  [key: string]: unknown;
}

const baseConfigs: Record<string, MentorConfig> = {
  general: general as MentorConfig,
  bible: bible as MentorConfig,
  chess: chess as MentorConfig,
  stock: stock as MentorConfig,
};

const DEFAULT_MENTOR_ID = "general";

function cloneConfig(config: MentorConfig): MentorConfig {
  return JSON.parse(JSON.stringify(config));
}

export function getBaseMentorConfig(mentorId: string): MentorConfig {
  const config = baseConfigs[mentorId] ?? baseConfigs[DEFAULT_MENTOR_ID];
  if (!config) {
    throw new Error(`Mentor configuration missing for ${mentorId}`);
  }
  return cloneConfig(config);
}

export function getAllMentorConfigs(): MentorConfig[] {
  return Object.values(baseConfigs).map(cloneConfig);
}

export function hasMentor(mentorId: string): boolean {
  return Object.prototype.hasOwnProperty.call(baseConfigs, mentorId);
}
