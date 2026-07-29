import { apiRequest } from "../../shared/api/client";

export type IdeaNoteWorkspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  orderIdx: number;
};

export type IdeaNoteCategory = {
  id: string;
  workspaceId: string;
  name: string;
  orderIdx: number;
};

export type IdeaNoteSection = {
  id: string;
  categoryId: string;
  title: string;
  orderIdx: number;
};

export type IdeaNoteDocument = {
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
): Promise<IdeaNoteWorkspace[]> {
  return apiRequest<IdeaNoteWorkspace[]>("/idea-note/workspaces", {
    token,
    errorMessage: "아이디어 노트 워크스페이스를 불러오지 못했습니다.",
  });
}

export function createWorkspace(
  token: string,
  body: { title: string; description?: string | null; icon?: string },
): Promise<IdeaNoteWorkspace> {
  return apiRequest<IdeaNoteWorkspace>("/idea-note/workspaces", {
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
): Promise<IdeaNoteWorkspace> {
  return apiRequest<IdeaNoteWorkspace>(
    `/idea-note/workspaces/${id}`,
    {
      method: "PATCH",
      body,
      token,
      errorMessage: "워크스페이스 이름을 변경하지 못했습니다.",
    },
  );
}

export function deleteWorkspace(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/idea-note/workspaces/${id}`, {
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
    `/idea-note/workspaces/${id}/summary`,
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
  return apiRequest<void>("/idea-note/workspaces/reorder", {
    method: "POST",
    body: { workspaceIds },
    token,
    errorMessage: "워크스페이스 순서를 변경하지 못했습니다.",
  });
}

export function getCategories(
  token: string,
  workspaceId: string,
): Promise<IdeaNoteCategory[]> {
  return apiRequest<IdeaNoteCategory[]>(
    `/idea-note/workspaces/${workspaceId}/categories`,
    { token, errorMessage: "1차 주제를 불러오지 못했습니다." },
  );
}

export function createCategory(
  token: string,
  workspaceId: string,
  body: { name: string },
): Promise<IdeaNoteCategory> {
  return apiRequest<IdeaNoteCategory>(
    `/idea-note/workspaces/${workspaceId}/categories`,
    { method: "POST", body, token, errorMessage: "1차 주제를 만들지 못했습니다." },
  );
}

export function updateCategory(
  token: string,
  id: string,
  body: { name: string },
): Promise<IdeaNoteCategory> {
  return apiRequest<IdeaNoteCategory>(
    `/idea-note/categories/${id}`,
    {
      method: "PATCH",
      body,
      token,
      errorMessage: "1차 주제 이름을 변경하지 못했습니다.",
    },
  );
}

export function deleteCategory(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/idea-note/categories/${id}`, {
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
    `/idea-note/workspaces/${workspaceId}/categories/reorder`,
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
): Promise<IdeaNoteSection[]> {
  return apiRequest<IdeaNoteSection[]>(
    `/idea-note/categories/${categoryId}/sections`,
    { token, errorMessage: "2차 주제를 불러오지 못했습니다." },
  );
}

export function createSection(
  token: string,
  body: { categoryId: string; title: string },
): Promise<IdeaNoteSection> {
  return apiRequest<IdeaNoteSection>("/idea-note/sections", {
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
): Promise<IdeaNoteSection> {
  return apiRequest<IdeaNoteSection>(`/idea-note/sections/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "2차 주제 이름을 변경하지 못했습니다.",
  });
}

export function deleteSection(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/idea-note/sections/${id}`, {
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
    `/idea-note/categories/${categoryId}/sections/reorder`,
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
): Promise<IdeaNoteDocument[]> {
  return apiRequest<IdeaNoteDocument[]>(
    `/idea-note/sections/${sectionId}/documents`,
    { token, errorMessage: "아이디어 노트 문서를 불러오지 못했습니다." },
  );
}

export function createNote(
  token: string,
  body: { sectionId: string; title: string; content: string },
): Promise<IdeaNoteDocument> {
  return apiRequest<IdeaNoteDocument>("/idea-note/documents", {
    method: "POST",
    body,
    token,
    errorMessage: "아이디어 노트 문서를 만들지 못했습니다.",
  });
}

export function updateNote(
  token: string,
  id: string,
  body: { title?: string; content?: string },
): Promise<IdeaNoteDocument> {
  return apiRequest<IdeaNoteDocument>(`/idea-note/documents/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "아이디어 노트 문서를 저장하지 못했습니다.",
  });
}

export function deleteNote(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/idea-note/documents/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "아이디어 노트 문서를 삭제하지 못했습니다.",
  });
}

export function reorderNotes(
  token: string,
  sectionId: string,
  noteIds: string[],
): Promise<void> {
  return apiRequest<void>(
    `/idea-note/sections/${sectionId}/documents/reorder`,
    {
      method: "POST",
      body: { documentIds: noteIds },
      token,
      errorMessage: "문서 순서를 변경하지 못했습니다.",
    },
  );
}
