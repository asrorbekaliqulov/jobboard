/**
 * AI Service - All 12 AI feature API calls
 * Base URL: /api/v1/ai/
 */
import { mainApi } from './api.ts';

const AI_BASE = `${mainApi}/api/v1/ai`;

const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function aiRequest<T>(endpoint: string, body: any): Promise<T> {
  const res = await fetch(`${AI_BASE}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'AI xizmatida xatolik' }));
    throw new Error(err.detail || `AI error: ${res.status}`);
  }
  return res.json();
}

async function aiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${AI_BASE}${endpoint}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Xatolik' }));
    throw new Error(err.detail || `Error: ${res.status}`);
  }
  return res.json();
}

// ==================== Types ====================

export interface MatchedWorker {
  resume_id: number;
  full_name: string;
  profession: string;
  experience: number;
  region: string;
  match_score: number;
  match_reason: string;
}

export interface WorkerFinderResponse {
  workers: MatchedWorker[];
  total_found: number;
  search_summary: string;
}

export interface JobPostWriterResponse {
  title: string;
  description: string;
  suggested_salary_from: number | null;
  suggested_salary_till: number | null;
  suggested_requirements: string[];
  suggested_work_hours: number | null;
  suggested_schedule: string | null;
  suggested_profession_id: number | null;
}

export interface ResumeBuilderResponse {
  professional_summary: string;
  skills: string[];
  experience_description: string;
  suggested_profession_id: number | null;
  suggested_profession_name: string | null;
  formatted_resume_text: string;
  // Form auto-fill fields
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  experience: number | null;
  gender: string | null;
  phone: string | null;
  telegram: string | null;
}

export interface CareerSuggestion {
  profession_name: string;
  profession_id: number | null;
  match_reason: string;
  estimated_salary_from: number | null;
  estimated_salary_till: number | null;
  growth_potential: string;
  how_to_start: string;
  required_skills: string[];
}

export interface CareerAdvisorResponse {
  suggestions: CareerSuggestion[];
  general_advice: string;
  market_overview: string;
}

export interface VoiceOperatorResponse {
  detected_intent: string;
  generated_content: any;
  confidence: number;
  cleaned_text: string;
}

export interface FraudIssue {
  issue_type: string;
  description: string;
  severity: string;
}

export interface FraudFilterResponse {
  is_suspicious: boolean;
  risk_score: number;
  severity: string;
  issues: FraudIssue[];
  recommendation: string;
  safe_to_apply: boolean;
}

export interface MatchResponse {
  overall_match: number;
  profession_match: number;
  experience_match: number;
  location_match: number;
  salary_match: number;
  explanation: string;
  recommendations: string[];
}

export interface TranslatorResponse {
  translated_text: string;
  detected_language: string;
  dialect_corrections: { original: string; corrected: string }[] | null;
  confidence: number;
}

export interface GigWorkerMatch {
  daily_job_seeker_id: number;
  full_name: string;
  works: string[];
  region: string;
  districts: string[];
  match_score: number;
  available: boolean;
}

export interface GigMatchResponse {
  matched_workers: GigWorkerMatch[];
  total_available: number;
  ai_summary: string;
}

export interface InterviewStartResponse {
  session_id: number;
  first_question: string;
  interviewer_intro: string;
  total_questions: number;
}

export interface InterviewAnswerResponse {
  feedback: string;
  next_question: string | null;
  is_completed: boolean;
  current_score: number | null;
}

export interface InterviewResultResponse {
  session_id: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  detailed_feedback: string;
}

export interface SalaryData {
  min_salary: number;
  max_salary: number;
  avg_salary: number;
  median_salary: number;
  sample_count: number;
}

export interface SalaryAnalyticsResponse {
  profession_name: string;
  region_name: string | null;
  salary_data: SalaryData;
  market_trend: string;
  ai_recommendation: string;
  is_salary_competitive: boolean | null;
  comparison_text: string;
  data_freshness: string;
}

export interface CompanyTrustResponse {
  company_name: string;
  overall_score: number;
  trust_level: string;
  total_reviews: number;
  total_vacancies: number;
  salary_punctuality: number;
  working_conditions: number;
  communication: number;
  is_verified: boolean;
  has_complaints: boolean;
  ai_summary: string;
}

export interface CompanyReviewResponse {
  review_id: number;
  message: string;
  updated_score: number;
}

// ==================== API Methods ====================

export const aiService = {
  // 1. AI Worker Finder
  findWorkers: (data: { description: string; region_id?: number; max_results?: number }) =>
    aiRequest<WorkerFinderResponse>('/worker-finder', data),

  // 2. AI Job Post Writer
  writeJobPost: (data: { simple_text: string; company_name?: string; region_id?: number; language?: string }) =>
    aiRequest<JobPostWriterResponse>('/job-post-writer', data),

  // 3. AI Resume Builder
  buildResume: (data: { simple_text: string; language?: string }) =>
    aiRequest<ResumeBuilderResponse>('/resume-builder', data),

  // 4. AI Career Advisor
  getCareerAdvice: (data: { age: number; interests: string[]; education_level?: string; current_skills?: string[]; region_id?: number; language?: string }) =>
    aiRequest<CareerAdvisorResponse>('/career-advisor', data),

  // 5. AI Voice Operator
  processVoice: (data: { transcribed_text: string; intent?: string; language?: string }) =>
    aiRequest<VoiceOperatorResponse>('/voice-operator', data),

  // 6. AI Fraud Filter
  checkFraud: (data: { description: string; salary_from?: number; salary_till?: number; phone?: string; company_name?: string; contact_telegram?: string }) =>
    aiRequest<FraudFilterResponse>('/fraud-filter', data),

  // 7. AI Match System
  calculateMatch: (data: { resume_id: number; vacancy_id: number }) =>
    aiRequest<MatchResponse>('/match', data),

  bulkMatch: (data: { resume_id: number; limit?: number }) =>
    aiRequest<{ matches: MatchResponse[]; resume_summary: string }>('/match/bulk', data),

  // 8. AI Translator
  translate: (data: { text: string; source_language?: string; target_language?: string; clean_dialect?: boolean }) =>
    aiRequest<TranslatorResponse>('/translate', data),

  // 9. AI Gig Economy
  findGigWorkers: (data: { work_description: string; region_id: number; district_ids?: number[]; needed_workers?: number; urgency?: string; budget?: number }) =>
    aiRequest<GigMatchResponse>('/gig-match', data),

  // 10. AI Interview
  startInterview: (data: { profession_id?: number; profession_name?: string; difficulty?: string; language?: string }) =>
    aiRequest<InterviewStartResponse>('/interview/start', data),

  answerInterview: (data: { session_id: number; answer: string }) =>
    aiRequest<InterviewAnswerResponse>('/interview/answer', data),

  getInterviewResults: (sessionId: number) =>
    aiGet<InterviewResultResponse>(`/interview/${sessionId}/results`),

  // 11. AI Salary Analytics
  getSalaryAnalytics: (data: { profession_id?: number; profession_name?: string; region_id?: number; experience_years?: number; role?: string }) =>
    aiRequest<SalaryAnalyticsResponse>('/salary-analytics', data),

  // 12. AI Company Trust
  getCompanyTrust: (data: { employer_user_id?: number; company_name?: string }) =>
    aiRequest<CompanyTrustResponse>('/company-trust', data),

  addCompanyReview: (data: { employer_user_id: number; company_name: string; salary_punctuality: number; working_conditions: number; communication: number; overall: number; comment?: string; is_anonymous?: boolean }) =>
    aiRequest<CompanyReviewResponse>('/company-trust/review', data),
};



// ==================== AI Agent Search ====================

export interface AgentSearchResult {
  id: number;
  type: string; // "vacancy" or "resume"
  title: string;
  subtitle: string;
  region: string;
  score: number;
  reason: string;
  phone?: string;
  telegram?: string;
  salary?: string;
  experience?: string | number;
}

export interface AgentSearchResponse {
  items: AgentSearchResult[];
  summary: string;
  total: number;
  search_type: string;
}

// Add to aiService object - but since it's already exported, add as separate export
export const aiAgentSearch = (data: { query: string; role?: string; region_id?: number; limit?: number }) =>
  aiRequest<AgentSearchResponse>('/agent-search', data);
