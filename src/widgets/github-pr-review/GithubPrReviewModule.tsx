import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  Circle,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import { WEB_BASE } from "../../shared/api/client";
import {
  analyzePrReview,
  getPrReviewDetail,
  getPrReviewPreferences,
  listPrReviews,
  savePrReviewPreferences,
  type PrCriterionFinding,
  type PrCriterionResult,
  type PrReviewCriterion,
  type PrReviewDetail,
  type PrReviewRiskLevel,
  type PrReviewSummary,
} from "../../features/github-pr-review/api";

function getPrUrlInputError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(trimmed)) {
    return "저장소 주소가 아니라 GitHub PR URL을 입력하세요.";
  }
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+(?:\.diff)?(?:[?#].*)?$/i.test(trimmed)) {
    return "예: https://github.com/owner/repo/pull/123";
  }
  return null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function riskLabel(riskLevel: PrReviewRiskLevel | PrCriterionFinding["severity"]) {
  if (riskLevel === "high") return "높음";
  if (riskLevel === "medium") return "중간";
  return "낮음";
}

function riskClassName(riskLevel: PrReviewRiskLevel | PrCriterionFinding["severity"]) {
  if (riskLevel === "high") return "border-danger-border bg-danger-glass text-danger-500";
  if (riskLevel === "medium") return "border-brand-border bg-brand-glass text-brand-primary";
  return "border-surface-border-soft bg-surface-muted text-text-secondary";
}

function statusLabel(status: PrCriterionResult["status"]) {
  if (status === "problem") return "문제 발견";
  if (status === "warning") return "주의";
  if (status === "not_applicable") return "해당 없음";
  return "발견 없음";
}

function statusClassName(status: PrCriterionResult["status"]) {
  if (status === "problem") return "border-danger-border bg-danger-glass text-danger-500";
  if (status === "warning") return "border-brand-border bg-brand-glass text-brand-primary";
  return "border-surface-border-soft bg-surface-muted text-text-secondary";
}

function truncate(value: string, length = 4000) {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trim()}...`;
}

function GithubPrReviewModule() {
  const [prUrl, setPrUrl] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [q, setQ] = useState("");
  const [reviews, setReviews] = useState<PrReviewSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PrReviewDetail | null>(null);
  const [criteriaDraft, setCriteriaDraft] = useState<PrReviewCriterion[]>([]);
  const [showCriteriaEditor, setShowCriteriaEditor] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCriteriaCount = useMemo(
    () => criteriaDraft.filter((criterion) => criterion.enabled).length,
    [criteriaDraft],
  );
  const inputError = getPrUrlInputError(prUrl);
  const canAnalyze = prUrl.trim().length > 0 && !inputError && activeCriteriaCount > 0;

  async function loadList(nextSelectedId = selectedId) {
    setLoadingList(true);
    setError(null);
    try {
      const data = await listPrReviews(q);
      setReviews(data.items);
      const resolvedId = nextSelectedId ?? data.items[0]?.id ?? null;
      setSelectedId(resolvedId);
      if (resolvedId) await loadDetail(resolvedId);
      else setDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PR 리뷰 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadDetail(reviewId: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const data = await getPrReviewDetail(reviewId);
      setDetail(data);
      setSelectedId(reviewId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PR 리뷰 본문을 불러오지 못했습니다.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadPreferences() {
    try {
      const preferences = await getPrReviewPreferences();
      setCriteriaDraft(preferences.criteria);
    } catch (err) {
      setError(err instanceof Error ? err.message : "리뷰 기준을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void loadPreferences();
    void loadList(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadList(selectedId);
  }

  async function onAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAnalyze) {
      setError(inputError ?? "활성 리뷰 기준을 하나 이상 선택하세요.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const data = await analyzePrReview(prUrl.trim(), reviewNote.trim());
      setPrUrl("");
      setDetail(data);
      setSelectedId(data.id);
      await loadList(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PR 리뷰 분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateCriterion(index: number, changes: Partial<PrReviewCriterion>) {
    setCriteriaDraft((current) =>
      current.map((criterion, criterionIndex) =>
        criterionIndex === index ? { ...criterion, ...changes } : criterion,
      ),
    );
  }

  function addCriterion() {
    setCriteriaDraft((current) => [
      ...current,
      {
        id: `draft-${Date.now()}`,
        title: "새 리뷰 기준",
        instruction: "이 PR에서 확인할 기준을 입력하세요.",
        enabled: true,
        orderIdx: current.length,
      },
    ]);
  }

  function removeCriterion(index: number) {
    setCriteriaDraft((current) =>
      current
        .filter((_, criterionIndex) => criterionIndex !== index)
        .map((criterion, orderIdx) => ({ ...criterion, orderIdx })),
    );
  }

  async function onSaveCriteria() {
    setSavingCriteria(true);
    setError(null);
    try {
      const preferences = await savePrReviewPreferences(
        criteriaDraft.map((criterion, orderIdx) => ({ ...criterion, orderIdx })),
      );
      setCriteriaDraft(preferences.criteria);
      setShowCriteriaEditor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "리뷰 기준 저장에 실패했습니다.");
    } finally {
      setSavingCriteria(false);
    }
  }

  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <PageHeader>
        <GitPullRequest className="size-5 text-brand-primary" strokeWidth={2} />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          GitHub PR 리뷰
        </span>
        <button
          type="button"
          onClick={() => openUrl(`${WEB_BASE}/github-pr-review`)}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-muted px-3 text-[12px] font-bold text-text-secondary transition hover:bg-surface-strong hover:text-text-primary"
        >
          <ExternalLink className="size-3.5" />
          웹에서 열기
        </button>
      </PageHeader>

      <form
        onSubmit={onAnalyze}
        className="shrink-0 border-b border-surface-border-soft bg-surface-raised px-4 py-3"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="min-w-0">
            <div className="flex flex-col gap-2 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <input
                  value={prUrl}
                  onChange={(event) => setPrUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="h-10 w-full rounded-md border border-surface-border-soft bg-background px-3 pr-10 text-[13px] font-semibold text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-border focus:ring-2 focus:ring-brand-border"
                  aria-label="GitHub PR URL"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              </div>
              <Button type="submit" disabled={!canAnalyze || analyzing} className="h-10 gap-2">
                {analyzing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                분석
              </Button>
            </div>
            {inputError && (
              <p className="mt-2 text-[12px] font-semibold text-danger-500">{inputError}</p>
            )}
            <textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="참고 사항: 인증 흐름, 테스트 관점, 특히 볼 파일 등"
              className="mt-2 min-h-16 w-full resize-none rounded-md border border-surface-border-soft bg-background px-3 py-2 text-[12px] leading-5 text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-border focus:ring-2 focus:ring-brand-border"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-bold text-text-secondary">
                <SlidersHorizontal className="size-3.5" />
                리뷰 기준 {activeCriteriaCount}개
              </div>
              <button
                type="button"
                onClick={() => setShowCriteriaEditor((value) => !value)}
                className="rounded-sm border border-surface-border-soft bg-background px-2 py-1 text-[11px] font-bold text-text-secondary transition hover:bg-surface-strong hover:text-text-primary"
              >
                설정
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {criteriaDraft.map((criterion, index) => {
                const active = criterion.enabled;
                return (
                  <button
                    key={criterion.id}
                    type="button"
                    onClick={() => updateCriterion(index, { enabled: !active })}
                    className={
                      "inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-[12px] font-bold transition " +
                      (active
                        ? "border-brand-border bg-brand-glass text-brand-primary"
                        : "border-surface-border-soft bg-surface-muted text-text-secondary hover:bg-surface-strong hover:text-text-primary")
                    }
                  >
                    {active && <Check className="size-3.5" />}
                    {criterion.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-danger-border bg-danger-glass px-3 py-2 text-[12px] font-semibold text-danger-500">
            {error}
          </p>
        )}
      </form>

      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-surface-border-soft bg-surface-muted">
          <form onSubmit={onSearch} className="shrink-0 border-b border-surface-border-soft p-3">
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="리뷰 히스토리 검색"
                className="h-9 min-w-0 flex-1 rounded-md border border-surface-border-soft bg-background px-3 py-2 text-[12px] font-semibold text-text-primary outline-none placeholder:text-text-muted focus:border-brand-border"
                aria-label="리뷰 히스토리 검색"
              />
              <Button type="submit" size="sm" variant="secondary" disabled={loadingList}>
                검색
              </Button>
            </div>
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingList ? (
              <div className="flex h-32 items-center justify-center text-[13px] text-text-muted">
                <Loader2 className="mr-2 size-4 animate-spin" />
                불러오는 중
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-2">
                {reviews.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void loadDetail(item.id)}
                    className={
                      "w-full rounded-md border p-3 text-left transition " +
                      (item.id === selectedId
                        ? "border-brand-border bg-brand-glass"
                        : "border-surface-border-soft bg-background hover:bg-surface-raised")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate text-[13px] font-extrabold text-text-primary">
                        {item.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold ${riskClassName(
                          item.riskLevel,
                        )}`}
                      >
                        {riskLabel(item.riskLevel)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-text-secondary">
                      {item.repository}
                      {item.prNumber ? ` #${item.prNumber}` : ""}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                      <span>{item.findingCount}개 항목</span>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-surface-border-soft bg-background p-4 text-[13px] text-text-muted">
                분석된 PR 리뷰가 없습니다.
              </div>
            )}
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto bg-background">
          {loadingDetail ? (
            <div className="flex h-full items-center justify-center text-[13px] text-text-muted">
              <Loader2 className="mr-2 size-4 animate-spin" />
              리뷰 본문을 불러오는 중
            </div>
          ) : detail ? (
            <ReviewDetail detail={detail} />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <GitPullRequest className="mx-auto size-10 text-text-muted" />
                <p className="mt-3 text-[14px] font-bold text-text-primary">
                  PR URL을 입력하고 분석하세요.
                </p>
                <p className="mt-1 text-[12px] text-text-muted">
                  분석 결과는 왼쪽 히스토리에 PR 단위로 저장됩니다.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showCriteriaEditor && (
        <div className="absolute inset-0 z-40 flex justify-end bg-background/45">
          <button
            type="button"
            aria-label="리뷰 기준 설정 닫기"
            className="min-w-0 flex-1 cursor-default"
            onClick={() => setShowCriteriaEditor(false)}
          />
          <aside className="flex h-full w-[520px] max-w-[calc(100%-72px)] flex-col border-l border-surface-border bg-surface-raised shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-surface-border-soft px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-extrabold text-text-primary">
                  <SlidersHorizontal className="size-4 text-brand-primary" />
                  리뷰 기준 설정
                </div>
                <p className="mt-1 text-[12px] leading-5 text-text-muted">
                  활성 기준 {activeCriteriaCount}개 · 최대 10개까지 저장됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCriteriaEditor(false)}
                className="rounded-sm border border-surface-border-soft bg-background px-2 py-1 text-[11px] font-bold text-text-secondary transition hover:bg-surface-strong hover:text-text-primary"
              >
                닫기
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {criteriaDraft.map((criterion, index) => (
                <div
                  key={criterion.id}
                  className="rounded-md border border-surface-border-soft bg-background p-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={criterion.enabled}
                      onChange={(event) =>
                        updateCriterion(index, { enabled: event.target.checked })
                      }
                      aria-label={`${criterion.title} 활성화`}
                      className="size-4 accent-brand-primary"
                    />
                    <input
                      value={criterion.title}
                      onChange={(event) =>
                        updateCriterion(index, { title: event.target.value })
                      }
                      className="h-9 min-w-0 flex-1 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-1 text-[13px] font-bold text-text-primary outline-none focus:border-brand-border"
                      aria-label="리뷰 기준 제목"
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      disabled={criteriaDraft.length <= 1}
                      className="inline-flex size-9 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-muted text-text-muted transition hover:bg-surface-strong hover:text-danger-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="리뷰 기준 삭제"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <textarea
                    value={criterion.instruction}
                    onChange={(event) =>
                      updateCriterion(index, { instruction: event.target.value })
                    }
                    placeholder="이 기준에서 확인할 내용을 입력하세요."
                    className="mt-2 min-h-24 w-full resize-none rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-[12px] leading-5 text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-border focus:ring-2 focus:ring-brand-border"
                  />
                </div>
              ))}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-surface-border-soft bg-background px-4 py-3">
              <button
                type="button"
                onClick={addCriterion}
                disabled={criteriaDraft.length >= 10}
                className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-surface-border-soft bg-surface-muted px-3 text-[12px] font-bold text-text-secondary transition hover:bg-surface-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="size-3.5" />
                기준 추가
              </button>
              <Button
                type="button"
                size="sm"
                onClick={onSaveCriteria}
                disabled={savingCriteria || activeCriteriaCount < 1}
                className="gap-1.5"
              >
                {savingCriteria ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                기준 저장
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ReviewDetail({ detail }: { detail: PrReviewDetail }) {
  return (
    <article className="mx-auto max-w-5xl px-5 py-6">
      <div className="border-b border-surface-border-soft pb-5">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-text-muted">
          <span>{detail.repository}</span>
          {detail.prNumber && (
            <>
              <span>ㆍ</span>
              <span>#{detail.prNumber}</span>
            </>
          )}
          {detail.baseRef && detail.headRef && (
            <>
              <span>ㆍ</span>
              <span>
                {detail.headRef} → {detail.baseRef}
              </span>
            </>
          )}
          {detail.prState && (
            <>
              <span>ㆍ</span>
              <span>{detail.prState.toUpperCase()}</span>
            </>
          )}
          <span>ㆍ</span>
          <span>{formatDateTime(detail.createdAt)}</span>
          <span
            className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(
              detail.riskLevel,
            )}`}
          >
            위험도 {riskLabel(detail.riskLevel)}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-extrabold tracking-normal text-text-primary">
              {detail.title}
            </h1>
            <p className="mt-2 max-w-4xl whitespace-pre-wrap text-[14px] leading-6 text-text-secondary">
              {detail.summary}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openUrl(detail.sourceUrl)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-sm border border-surface-border-soft bg-surface-muted px-3 text-[12px] font-bold text-text-primary transition hover:bg-surface-strong"
          >
            <ExternalLink className="size-4" />
            PR 열기
          </button>
        </div>
      </div>

      {detail.reviewNote && (
        <section className="mt-6 rounded-md border border-surface-border-soft bg-surface-muted p-4">
          <h2 className="text-[14px] font-extrabold text-text-primary">이번 리뷰 참고사항</h2>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-text-secondary">
            {detail.reviewNote}
          </p>
        </section>
      )}

      <section className="mt-6 space-y-4">
        {detail.criterionResults.length > 0 ? (
          detail.criterionResults.map((result, index) => (
            <CriterionResultSection
              key={`${result.criterionId}-${index}`}
              result={result}
              index={index}
            />
          ))
        ) : (
          <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4 text-[13px] text-text-muted">
            기준별 결과가 없는 기존 리뷰입니다.
          </div>
        )}
      </section>

      {detail.testGaps.length > 0 && (
        <section className="mt-6 rounded-md border border-surface-border-soft bg-surface-muted p-4">
          <h2 className="text-[14px] font-extrabold text-text-primary">검증 참고</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-6 text-text-secondary">
            {detail.testGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function CriterionResultSection({
  result,
  index,
}: {
  result: PrCriterionResult;
  index: number;
}) {
  return (
    <section className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
              {index + 1}. {result.criterionTitle}
            </span>
            <span
              className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${statusClassName(
                result.status,
              )}`}
            >
              {statusLabel(result.status)}
            </span>
          </div>
          <p className="mt-2 text-[14px] leading-6 text-text-secondary">{result.summary}</p>
        </div>
      </div>
      {result.findings.length > 0 ? (
        <div className="mt-4 space-y-3">
          {result.findings.map((finding, findingIndex) => (
            <div
              key={`${finding.message}-${findingIndex}`}
              className="rounded-md border border-surface-border-soft bg-background p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(
                    finding.severity,
                  )}`}
                >
                  <SeverityIcon severity={finding.severity} />
                  {riskLabel(finding.severity)}
                </span>
                <strong className="text-[14px] text-text-primary">{finding.message}</strong>
              </div>
              {finding.filePath && (
                <p className="mt-1 text-[12px] text-text-muted">
                  {finding.filePath}
                  {finding.lineNumber ? `:${finding.lineNumber}` : ""}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-text-secondary">
                {truncate(finding.evidence, 2400)}
              </p>
              <p className="mt-3 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-[14px] leading-6 text-text-secondary">
                {finding.recommendation}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-surface-border-soft bg-background px-3 py-2 text-[14px] leading-6 text-text-muted">
          제공된 diff 범위에서는 이 기준에 대한 명확한 발견 사항이 없습니다.
        </p>
      )}
    </section>
  );
}

function SeverityIcon({ severity }: { severity: PrCriterionFinding["severity"] }) {
  if (severity === "high") return <AlertTriangle className="size-3" />;
  if (severity === "medium") return <Circle className="size-3" />;
  return <Check className="size-3" />;
}

export default GithubPrReviewModule;
