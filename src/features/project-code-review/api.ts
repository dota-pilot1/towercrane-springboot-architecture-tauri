import { apiRequest } from "../../shared/api/client";

export type PcrWorkspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  orderIdx: number;
};

export type PcrCategory = {
  id: string;
  workspaceId: string;
  name: string;
  orderIdx: number;
};

export type PcrSection = {
  id: string;
  categoryId: string;
  title: string;
  orderIdx: number;
};

export type PcrNote = {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  orderIdx: number;
};

// ── 워크스페이스 (프로젝트) ───────────────────────────────
export function listWorkspaces(token: string): Promise<PcrWorkspace[]> {
  return apiRequest<PcrWorkspace[]>("/project-code-review/workspaces", {
    token,
    errorMessage: "프로젝트를 불러오지 못했습니다.",
  });
}

export function createWorkspace(
  token: string,
  body: { title: string; description?: string | null; icon?: string },
): Promise<PcrWorkspace> {
  return apiRequest<PcrWorkspace>("/project-code-review/workspaces", {
    method: "POST",
    body,
    token,
    errorMessage: "프로젝트를 만들지 못했습니다.",
  });
}

export function updateWorkspace(
  token: string,
  id: string,
  body: { title?: string; description?: string | null; icon?: string },
): Promise<PcrWorkspace> {
  return apiRequest<PcrWorkspace>(`/project-code-review/workspaces/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

export function deleteWorkspace(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/project-code-review/workspaces/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

// ── 1차 주제 (카테고리) ───────────────────────────────────
export function getCategories(
  token: string,
  workspaceId: string,
): Promise<PcrCategory[]> {
  return apiRequest<PcrCategory[]>(
    `/project-code-review/workspaces/${workspaceId}/categories`,
    { token, errorMessage: "카테고리를 불러오지 못했습니다." },
  );
}

export function createCategory(
  token: string,
  workspaceId: string,
  body: { name: string },
): Promise<PcrCategory> {
  return apiRequest<PcrCategory>(
    `/project-code-review/workspaces/${workspaceId}/categories`,
    { method: "POST", body, token, errorMessage: "카테고리를 만들지 못했습니다." },
  );
}

export function deleteCategory(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/project-code-review/categories/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function reorderCategories(
  token: string,
  workspaceId: string,
  categoryIds: string[],
): Promise<void> {
  return apiRequest<void>(
    `/project-code-review/workspaces/${workspaceId}/categories/reorder`,
    { method: "POST", body: { categoryIds }, token, errorMessage: "순서 변경 실패" },
  );
}

// ── 2차 주제 (섹션) ───────────────────────────────────────
export function getSections(
  token: string,
  categoryId: string,
): Promise<PcrSection[]> {
  return apiRequest<PcrSection[]>(
    `/project-code-review/categories/${categoryId}/sections`,
    { token, errorMessage: "섹션을 불러오지 못했습니다." },
  );
}

export function createSection(
  token: string,
  body: { categoryId: string; title: string },
): Promise<PcrSection> {
  return apiRequest<PcrSection>("/project-code-review/sections", {
    method: "POST",
    body,
    token,
    errorMessage: "섹션을 만들지 못했습니다.",
  });
}

export function deleteSection(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/project-code-review/sections/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function reorderSections(
  token: string,
  categoryId: string,
  sectionIds: string[],
): Promise<void> {
  return apiRequest<void>(
    `/project-code-review/categories/${categoryId}/sections/reorder`,
    { method: "POST", body: { sectionIds }, token, errorMessage: "순서 변경 실패" },
  );
}

// ── 노트 (리뷰 노트) ──────────────────────────────────────
export function getNotes(
  token: string,
  sectionId: string,
): Promise<PcrNote[]> {
  return apiRequest<PcrNote[]>(
    `/project-code-review/sections/${sectionId}/notes`,
    { token, errorMessage: "노트를 불러오지 못했습니다." },
  );
}

export function createNote(
  token: string,
  body: { sectionId: string; title: string; content: string },
): Promise<PcrNote> {
  return apiRequest<PcrNote>("/project-code-review/notes", {
    method: "POST",
    body,
    token,
    errorMessage: "노트를 만들지 못했습니다.",
  });
}

export function updateNote(
  token: string,
  id: string,
  body: { title?: string; content?: string },
): Promise<PcrNote> {
  return apiRequest<PcrNote>(`/project-code-review/notes/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

export function deleteNote(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/project-code-review/notes/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function reorderNotes(
  token: string,
  sectionId: string,
  noteIds: string[],
): Promise<void> {
  return apiRequest<void>(
    `/project-code-review/sections/${sectionId}/notes/reorder`,
    { method: "POST", body: { noteIds }, token, errorMessage: "순서 변경 실패" },
  );
}
