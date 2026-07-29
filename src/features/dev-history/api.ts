import { apiRequest } from "../../shared/api/client";

export type DevHistoryWorkspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  orderIdx: number;
};

export type DevHistoryCategory = {
  id: string;
  workspaceId: string;
  name: string;
  orderIdx: number;
};

export type DevHistorySection = {
  id: string;
  categoryId: string;
  title: string;
  orderIdx: number;
};

export type DevHistoryDocument = {
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

export function listWorkspaces(
  token: string,
): Promise<DevHistoryWorkspace[]> {
  return apiRequest<DevHistoryWorkspace[]>("/dev-history/workspaces", {
    token,
    errorMessage: "개발 일지 워크스페이스를 불러오지 못했습니다.",
  });
}

export function createWorkspace(
  token: string,
  body: { title: string; description?: string | null; icon?: string },
): Promise<DevHistoryWorkspace> {
  return apiRequest<DevHistoryWorkspace>("/dev-history/workspaces", {
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
): Promise<DevHistoryWorkspace> {
  return apiRequest<DevHistoryWorkspace>(
    `/dev-history/workspaces/${id}`,
    {
      method: "PATCH",
      body,
      token,
      errorMessage: "워크스페이스 이름을 변경하지 못했습니다.",
    },
  );
}

export function deleteWorkspace(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/dev-history/workspaces/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "워크스페이스를 삭제하지 못했습니다.",
  });
}

export function getWorkspaceSummary(
  token: string,
  id: string,
): Promise<WorkspaceSummary> {
  return apiRequest<WorkspaceSummary>(
    `/dev-history/workspaces/${id}/summary`,
    {
      token,
      errorMessage: "워크스페이스 현황을 불러오지 못했습니다.",
    },
  );
}

export function reorderWorkspaces(
  token: string,
  workspaceIds: string[],
): Promise<void> {
  return apiRequest<void>("/dev-history/workspaces/reorder", {
    method: "POST",
    body: { workspaceIds },
    token,
    errorMessage: "워크스페이스 순서를 변경하지 못했습니다.",
  });
}

export function getCategories(
  token: string,
  workspaceId: string,
): Promise<DevHistoryCategory[]> {
  return apiRequest<DevHistoryCategory[]>(
    `/dev-history/workspaces/${workspaceId}/categories`,
    { token, errorMessage: "1차 주제를 불러오지 못했습니다." },
  );
}

export function createCategory(
  token: string,
  workspaceId: string,
  body: { name: string },
): Promise<DevHistoryCategory> {
  return apiRequest<DevHistoryCategory>(
    `/dev-history/workspaces/${workspaceId}/categories`,
    { method: "POST", body, token, errorMessage: "1차 주제를 만들지 못했습니다." },
  );
}

export function updateCategory(
  token: string,
  id: string,
  body: { name: string },
): Promise<DevHistoryCategory> {
  return apiRequest<DevHistoryCategory>(
    `/dev-history/categories/${id}`,
    {
      method: "PATCH",
      body,
      token,
      errorMessage: "1차 주제 이름을 변경하지 못했습니다.",
    },
  );
}

export function deleteCategory(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/dev-history/categories/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "1차 주제를 삭제하지 못했습니다.",
  });
}

export function reorderCategories(
  token: string,
  workspaceId: string,
  categoryIds: string[],
): Promise<void> {
  return apiRequest<void>(
    `/dev-history/workspaces/${workspaceId}/categories/reorder`,
    {
      method: "POST",
      body: { categoryIds },
      token,
      errorMessage: "1차 주제 순서를 변경하지 못했습니다.",
    },
  );
}

export function getSections(
  token: string,
  categoryId: string,
): Promise<DevHistorySection[]> {
  return apiRequest<DevHistorySection[]>(
    `/dev-history/categories/${categoryId}/sections`,
    { token, errorMessage: "2차 주제를 불러오지 못했습니다." },
  );
}

export function createSection(
  token: string,
  body: { categoryId: string; title: string },
): Promise<DevHistorySection> {
  return apiRequest<DevHistorySection>("/dev-history/sections", {
    method: "POST",
    body,
    token,
    errorMessage: "2차 주제를 만들지 못했습니다.",
  });
}

export function updateSection(
  token: string,
  id: string,
  body: { title: string },
): Promise<DevHistorySection> {
  return apiRequest<DevHistorySection>(`/dev-history/sections/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "2차 주제 이름을 변경하지 못했습니다.",
  });
}

export function deleteSection(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/dev-history/sections/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "2차 주제를 삭제하지 못했습니다.",
  });
}

export function reorderSections(
  token: string,
  categoryId: string,
  sectionIds: string[],
): Promise<void> {
  return apiRequest<void>(
    `/dev-history/categories/${categoryId}/sections/reorder`,
    {
      method: "POST",
      body: { sectionIds },
      token,
      errorMessage: "2차 주제 순서를 변경하지 못했습니다.",
    },
  );
}

// 공용 계층형 문서 화면의 note 인터페이스에 맞춰 함수명만 유지한다.
export function getNotes(
  token: string,
  sectionId: string,
): Promise<DevHistoryDocument[]> {
  return apiRequest<DevHistoryDocument[]>(
    `/dev-history/sections/${sectionId}/documents`,
    { token, errorMessage: "개발 일지를 불러오지 못했습니다." },
  );
}

export function createNote(
  token: string,
  body: { sectionId: string; title: string; content: string },
): Promise<DevHistoryDocument> {
  return apiRequest<DevHistoryDocument>("/dev-history/documents", {
    method: "POST",
    body,
    token,
    errorMessage: "개발 일지를 만들지 못했습니다.",
  });
}

export function updateNote(
  token: string,
  id: string,
  body: { title?: string; content?: string },
): Promise<DevHistoryDocument> {
  return apiRequest<DevHistoryDocument>(`/dev-history/documents/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "개발 일지를 저장하지 못했습니다.",
  });
}

export function deleteNote(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/dev-history/documents/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "개발 일지를 삭제하지 못했습니다.",
  });
}

export function reorderNotes(
  token: string,
  sectionId: string,
  noteIds: string[],
): Promise<void> {
  return apiRequest<void>(
    `/dev-history/sections/${sectionId}/documents/reorder`,
    {
      method: "POST",
      body: { documentIds: noteIds },
      token,
      errorMessage: "일지 순서를 변경하지 못했습니다.",
    },
  );
}
