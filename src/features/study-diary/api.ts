import { apiRequest } from "../../shared/api/client";

export type StudyDiary = {
  id: string;
  title: string;
  description: string;
};

export type DiaryCategory = {
  id: string;
  name: string;
  orderIdx: number;
};

export type DiarySection = {
  id: string;
  categoryId: string;
  title: string;
  orderIdx: number;
};

export type DiaryNote = {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  orderIdx: number;
};

// 내 다이어리
export function getMyDiary(token: string): Promise<StudyDiary> {
  return apiRequest<StudyDiary>("/study-diary/me", {
    token,
    errorMessage: "다이어리를 불러오지 못했습니다.",
  });
}

export function updateMyDiary(
  token: string,
  body: { title?: string; description?: string },
): Promise<StudyDiary> {
  return apiRequest<StudyDiary>("/study-diary/me", {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

// 카테고리
export function getCategories(token: string): Promise<DiaryCategory[]> {
  return apiRequest<DiaryCategory[]>("/study-diary/categories", {
    token,
    errorMessage: "카테고리를 불러오지 못했습니다.",
  });
}

export function createCategory(
  token: string,
  body: { name: string },
): Promise<DiaryCategory> {
  return apiRequest<DiaryCategory>("/study-diary/categories", {
    method: "POST",
    body,
    token,
    errorMessage: "카테고리를 만들지 못했습니다.",
  });
}

export function updateCategory(
  token: string,
  id: string,
  body: { name?: string },
): Promise<DiaryCategory> {
  return apiRequest<DiaryCategory>(`/study-diary/categories/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

export function deleteCategory(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/study-diary/categories/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function reorderCategories(
  token: string,
  categoryIds: string[],
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/study-diary/categories/reorder", {
    method: "POST",
    body: { categoryIds },
    token,
    errorMessage: "순서를 바꾸지 못했습니다.",
  });
}

// 섹션
export function getSectionsByCategory(
  token: string,
  categoryId: string,
): Promise<DiarySection[]> {
  return apiRequest<DiarySection[]>(
    `/study-diary/categories/${categoryId}/sections`,
    {
      token,
      errorMessage: "섹션을 불러오지 못했습니다.",
    },
  );
}

export function createSection(
  token: string,
  body: { categoryId: string; title: string },
): Promise<DiarySection> {
  return apiRequest<DiarySection>("/study-diary/sections", {
    method: "POST",
    body,
    token,
    errorMessage: "섹션을 만들지 못했습니다.",
  });
}

export function updateSection(
  token: string,
  id: string,
  body: { title?: string },
): Promise<DiarySection> {
  return apiRequest<DiarySection>(`/study-diary/sections/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

export function deleteSection(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/study-diary/sections/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function reorderSections(
  token: string,
  categoryId: string,
  sectionIds: string[],
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/study-diary/sections/reorder", {
    method: "POST",
    body: { categoryId, sectionIds },
    token,
    errorMessage: "순서를 바꾸지 못했습니다.",
  });
}

// 노트
export function getMyNotes(
  token: string,
  sectionId: string,
): Promise<DiaryNote[]> {
  return apiRequest<DiaryNote[]>(
    `/study-diary/sections/${sectionId}/notes/mine`,
    {
      token,
      errorMessage: "노트를 불러오지 못했습니다.",
    },
  );
}

export function createNote(
  token: string,
  body: { sectionId: string; title: string; content: string },
): Promise<DiaryNote> {
  return apiRequest<DiaryNote>("/study-diary/notes", {
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
): Promise<DiaryNote> {
  return apiRequest<DiaryNote>(`/study-diary/notes/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

export function deleteNote(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/study-diary/notes/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function reorderNotes(
  token: string,
  sectionId: string,
  noteIds: string[],
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/study-diary/sections/${sectionId}/notes/reorder`,
    {
      method: "POST",
      body: { noteIds },
      token,
      errorMessage: "순서를 바꾸지 못했습니다.",
    },
  );
}
