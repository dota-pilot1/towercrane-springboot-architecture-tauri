import { apiRequest } from "../../shared/api/client";

export type PlanningDesignWorkspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  orderIdx: number;
};

export type PlanningDesignCategory = {
  id: string;
  workspaceId: string;
  name: string;
  orderIdx: number;
};

export type PlanningDesignSection = {
  id: string;
  categoryId: string;
  title: string;
  orderIdx: number;
};

export type PlanningDesignDocument = {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  orderIdx: number;
};

export function listWorkspaces(
  token: string,
): Promise<PlanningDesignWorkspace[]> {
  return apiRequest<PlanningDesignWorkspace[]>("/planning-design/workspaces", {
    token,
    errorMessage: "기획·설계 워크스페이스를 불러오지 못했습니다.",
  });
}

export function createWorkspace(
  token: string,
  body: { title: string; description?: string | null; icon?: string },
): Promise<PlanningDesignWorkspace> {
  return apiRequest<PlanningDesignWorkspace>("/planning-design/workspaces", {
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
): Promise<PlanningDesignWorkspace> {
  return apiRequest<PlanningDesignWorkspace>(
    `/planning-design/workspaces/${id}`,
    {
      method: "PATCH",
      body,
      token,
      errorMessage: "워크스페이스 이름을 변경하지 못했습니다.",
    },
  );
}

export function deleteWorkspace(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/planning-design/workspaces/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "워크스페이스를 삭제하지 못했습니다.",
  });
}

export function getCategories(
  token: string,
  workspaceId: string,
): Promise<PlanningDesignCategory[]> {
  return apiRequest<PlanningDesignCategory[]>(
    `/planning-design/workspaces/${workspaceId}/categories`,
    { token, errorMessage: "1차 주제를 불러오지 못했습니다." },
  );
}

export function createCategory(
  token: string,
  workspaceId: string,
  body: { name: string },
): Promise<PlanningDesignCategory> {
  return apiRequest<PlanningDesignCategory>(
    `/planning-design/workspaces/${workspaceId}/categories`,
    { method: "POST", body, token, errorMessage: "1차 주제를 만들지 못했습니다." },
  );
}

export function updateCategory(
  token: string,
  id: string,
  body: { name: string },
): Promise<PlanningDesignCategory> {
  return apiRequest<PlanningDesignCategory>(
    `/planning-design/categories/${id}`,
    {
      method: "PATCH",
      body,
      token,
      errorMessage: "1차 주제 이름을 변경하지 못했습니다.",
    },
  );
}

export function deleteCategory(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/planning-design/categories/${id}`, {
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
    `/planning-design/workspaces/${workspaceId}/categories/reorder`,
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
): Promise<PlanningDesignSection[]> {
  return apiRequest<PlanningDesignSection[]>(
    `/planning-design/categories/${categoryId}/sections`,
    { token, errorMessage: "2차 주제를 불러오지 못했습니다." },
  );
}

export function createSection(
  token: string,
  body: { categoryId: string; title: string },
): Promise<PlanningDesignSection> {
  return apiRequest<PlanningDesignSection>("/planning-design/sections", {
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
): Promise<PlanningDesignSection> {
  return apiRequest<PlanningDesignSection>(`/planning-design/sections/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "2차 주제 이름을 변경하지 못했습니다.",
  });
}

export function deleteSection(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/planning-design/sections/${id}`, {
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
    `/planning-design/categories/${categoryId}/sections/reorder`,
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
): Promise<PlanningDesignDocument[]> {
  return apiRequest<PlanningDesignDocument[]>(
    `/planning-design/sections/${sectionId}/documents`,
    { token, errorMessage: "기획·설계 문서를 불러오지 못했습니다." },
  );
}

export function createNote(
  token: string,
  body: { sectionId: string; title: string; content: string },
): Promise<PlanningDesignDocument> {
  return apiRequest<PlanningDesignDocument>("/planning-design/documents", {
    method: "POST",
    body,
    token,
    errorMessage: "기획·설계 문서를 만들지 못했습니다.",
  });
}

export function updateNote(
  token: string,
  id: string,
  body: { title?: string; content?: string },
): Promise<PlanningDesignDocument> {
  return apiRequest<PlanningDesignDocument>(`/planning-design/documents/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "기획·설계 문서를 저장하지 못했습니다.",
  });
}

export function deleteNote(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/planning-design/documents/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "기획·설계 문서를 삭제하지 못했습니다.",
  });
}

export function reorderNotes(
  token: string,
  sectionId: string,
  noteIds: string[],
): Promise<void> {
  return apiRequest<void>(
    `/planning-design/sections/${sectionId}/documents/reorder`,
    {
      method: "POST",
      body: { documentIds: noteIds },
      token,
      errorMessage: "문서 순서를 변경하지 못했습니다.",
    },
  );
}
