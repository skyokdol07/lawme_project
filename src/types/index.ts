// src/types/index.ts

export interface CandidateCrime {
  crime_name: string;
  law_name: string;
  article: string;
  paragraph: string;
  reason: string;
}

export interface AiAnalysisResult {
  facts: string[];
  unknowns: string[];
  candidate_crimes: CandidateCrime[];
  requires_clarification: boolean;
  is_emergency: boolean;
}

export interface CrimeResult {
  crime_name: string;
  law_name: string;
  article: string;
  title?: string;
  statutory_penalty: string;
  verified: boolean;
  verification_source: string;
  law_url: string;
  article_content: string;
  applicability: string;
  missing_facts: string[];
  reason: string;
  enforcement_date?: string;
}

export type AnalysisStatus =
  | 'verified'
  | 'needs_clarification'
  | 'unverified'
  | 'error'
  | 'emergency';

export interface AnalyzeResponse {
  status: AnalysisStatus;
  results: CrimeResult[];
  facts: string[];
  unknowns: string[];
  disclaimer: string;
  error_message?: string;
  is_emergency?: boolean;
  query_timestamp?: string;
}

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}
