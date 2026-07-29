import { apiRequest } from "../../shared/api/client";

export type ArchWorkspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  orderIdx: number;
};

export type ArchCategory = {
  id: string;
  workspaceId: string;
  name: string;
  orderIdx: number;
};

export type ArchSection = {
  id: string;
  categoryId: string;
  title: string;
  orderIdx: number;
};

export type ArchNote = {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  orderIdx: number;
};

export type WorkspaceSummary = {
  categoryCount: number;
  sectionCount: number;
  itemCount: number;
};

// ── 워크스페이스 ──────────────────────────────────────────
export function listWorkspaces(token: string): Promise<ArchWorkspace[]> {
  return apiRequest<ArchWorkspace[]>("/arch-note/workspaces", {
    token,
    errorMessage: "워크스페이스를 불러오지 못했습니다.",
  });
}

export function createWorkspace(
  token: string,
  body: { title: string; description?: string | null; icon?: string },
): Promise<ArchWorkspace> {
  return apiRequest<ArchWorkspace>("/arch-note/workspaces", {
    method: "POST",
    body,
    token,
    errorMessage: "워크스페이스를 만들지 못했습니다.",
  });
}

export function updateWorkspace(
  token: string,
  id: string,
  body: { title?: string; description?: string | null; icon?: string },
): Promise<ArchWorkspace> {
  return apiRequest<ArchWorkspace>(`/arch-note/workspaces/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

export function deleteWorkspace(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/arch-note/workspaces/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function getWorkspaceSummary(
  token: string,
  id: string,
): Promise<WorkspaceSummary> {
  return apiRequest<WorkspaceSummary>(`/arch-note/workspaces/${id}/summary`, {
    token,
    errorMessage: "워크스페이스 현황을 불러오지 못했습니다.",
  });
}

export function reorderWorkspaces(
  token: string,
  workspaceIds: string[],
): Promise<void> {
  return apiRequest<void>("/arch-note/workspaces/reorder", {
    method: "POST",
    body: { workspaceIds },
    token,
    errorMessage: "워크스페이스 순서를 변경하지 못했습니다.",
  });
}

// ── 1차 주제 (카테고리) ───────────────────────────────────
export function getCategories(
  token: string,
  workspaceId: string,
): Promise<ArchCategory[]> {
  return apiRequest<ArchCategory[]>(
    `/arch-note/workspaces/${workspaceId}/categories`,
    { token, errorMessage: "카테고리를 불러오지 못했습니다." },
  );
}

export function createCategory(
  token: string,
  workspaceId: string,
  body: { name: string },
): Promise<ArchCategory> {
  return apiRequest<ArchCategory>(
    `/arch-note/workspaces/${workspaceId}/categories`,
    { method: "POST", body, token, errorMessage: "카테고리를 만들지 못했습니다." },
  );
}

export function updateCategory(
  token: string,
  id: string,
  body: { name: string },
): Promise<ArchCategory> {
  return apiRequest<ArchCategory>(`/arch-note/categories/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "1차 주제 이름을 변경하지 못했습니다.",
  });
}

export function deleteCategory(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/arch-note/categories/${id}`, {
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
    `/arch-note/workspaces/${workspaceId}/categories/reorder`,
    { method: "POST", body: { categoryIds }, token, errorMessage: "순서 변경 실패" },
  );
}

// ── 2차 주제 (섹션) ───────────────────────────────────────
export function getSections(
  token: string,
  categoryId: string,
): Promise<ArchSection[]> {
  return apiRequest<ArchSection[]>(
    `/arch-note/categories/${categoryId}/sections`,
    { token, errorMessage: "섹션을 불러오지 못했습니다." },
  );
}

export function createSection(
  token: string,
  body: { categoryId: string; title: string },
): Promise<ArchSection> {
  return apiRequest<ArchSection>("/arch-note/sections", {
    method: "POST",
    body,
    token,
    errorMessage: "섹션을 만들지 못했습니다.",
  });
}

export function updateSection(
  token: string,
  id: string,
  body: { title: string },
): Promise<ArchSection> {
  return apiRequest<ArchSection>(`/arch-note/sections/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "2차 주제 이름을 변경하지 못했습니다.",
  });
}

export function deleteSection(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/arch-note/sections/${id}`, {
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
    `/arch-note/categories/${categoryId}/sections/reorder`,
    { method: "POST", body: { sectionIds }, token, errorMessage: "순서 변경 실패" },
  );
}

// ── 노트 ──────────────────────────────────────────────────
export function getNotes(
  token: string,
  sectionId: string,
): Promise<ArchNote[]> {
  return apiRequest<ArchNote[]>(`/arch-note/sections/${sectionId}/notes`, {
    token,
    errorMessage: "노트를 불러오지 못했습니다.",
  });
}

export function createNote(
  token: string,
  body: { sectionId: string; title: string; content: string },
): Promise<ArchNote> {
  return apiRequest<ArchNote>("/arch-note/notes", {
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
): Promise<ArchNote> {
  return apiRequest<ArchNote>(`/arch-note/notes/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

export function reorderNotes(
  token: string,
  sectionId: string,
  noteIds: string[],
): Promise<void> {
  return apiRequest<void>(`/arch-note/sections/${sectionId}/notes/reorder`, {
    method: "POST",
    body: { noteIds },
    token,
    errorMessage: "순서 변경 실패",
  });
}

export function deleteNote(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/arch-note/notes/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}
