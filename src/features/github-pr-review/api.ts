import { apiRequest, getToken } from "../../shared/api/client";

export type PrReviewRiskLevel = "low" | "medium" | "high";
export type PrReviewFindingSeverity = "low" | "medium" | "high";

export type PrReviewCriterion = {
  id: string;
  title: string;
  instruction: string;
  enabled: boolean;
  orderIdx: number;
};

export type PrCriterionFinding = {
  severity: PrReviewFindingSeverity;
  message: string;
  filePath: string | null;
  lineNumber: number | null;
  evidence: string;
  recommendation: string;
};

export type PrCriterionResult = {
  criterionId: string;
  criterionTitle: string;
  status: "problem" | "warning" | "no_finding" | "not_applicable";
  summary: string;
  findings: PrCriterionFinding[];
};

export type PrReviewSummary = {
  id: string;
  sourceUrl: string;
  repository: string;
  title: string;
  summary: string;
  riskLevel: PrReviewRiskLevel;
  findingCount: number;
  changedFileCount: number;
  excludedFileCount: number;
  prNumber: number | null;
  prState: string | null;
  headSha: string | null;
  createdAt: string;
};

export type PrReviewDetail = PrReviewSummary & {
  prTitle: string | null;
  prAuthorLogin: string | null;
  baseRef: string | null;
  headRef: string | null;
  prUpdatedAt: string | null;
  reviewNote: string | null;
  criteriaSnapshot: PrReviewCriterion[];
  criterionResults: PrCriterionResult[];
  testGaps: string[];
  duplicate?: boolean;
};

export type PrReviewListResponse = {
  items: PrReviewSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PrReviewPreferences = {
  criteria: PrReviewCriterion[];
  version: number;
  updatedAt: string;
};

function token() {
  const value = getToken();
  if (!value) throw new Error("로그인이 필요합니다.");
  return value;
}

export function listPrReviews(q = "") {
  const search = new URLSearchParams({
    sourceType: "pr",
    page: "1",
    pageSize: "50",
  });
  if (q.trim()) search.set("q", q.trim());
  return apiRequest<PrReviewListResponse>(`/code-reviews?${search.toString()}`, {
    token: token(),
  });
}

export function getPrReviewDetail(reviewId: string) {
  return apiRequest<PrReviewDetail>(`/code-reviews/${reviewId}`, {
    token: token(),
  });
}

export function analyzePrReview(sourceUrl: string, reviewNote: string) {
  return apiRequest<PrReviewDetail>("/code-reviews/pr/analyze", {
    method: "POST",
    token: token(),
    body: { sourceUrl, reviewNote },
  });
}

export function getPrReviewPreferences() {
  return apiRequest<PrReviewPreferences>("/code-reviews/preferences", {
    token: token(),
  });
}

export function savePrReviewPreferences(criteria: PrReviewCriterion[]) {
  return apiRequest<PrReviewPreferences>("/code-reviews/preferences", {
    method: "PUT",
    token: token(),
    body: { criteria },
  });
}
