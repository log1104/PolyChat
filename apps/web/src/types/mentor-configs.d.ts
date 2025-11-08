declare module "../../../../config/mentors/*.json" {
  const value: {
    id: string;
    systemPrompt: string;
    styleGuidelines?: string[];
    tooling?: {
      tools?: string[];
      fallback?: string | null;
    };
    [key: string]: unknown;
  };
  export default value;
}
