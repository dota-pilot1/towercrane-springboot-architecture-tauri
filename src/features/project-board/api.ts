import { apiRequest } from "../../shared/api/client";

export type ProjectBoard = {
  id: string;
  name: string;
  description: string;
  orderIdx: number;
  createdBy: string;
  createdByName: string;
  postCount: number;
  lastPostAt: string | null;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
};

export type ProjectBoardPostSummary = {
  id: string;
  boardId: string;
  title: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectBoardPostDetail = ProjectBoardPostSummary & {
  canEdit: boolean;
  canDelete: boolean;
};

export function listProjectBoards(token: string): Promise<ProjectBoard[]> {
  return apiRequest<ProjectBoard[]>("/project-board/boards", {
    token,
    errorMessage: "프로젝트 게시판을 불러오지 못했습니다.",
  });
}

export function createProjectBoard(
  token: string,
  body: { name: string; description?: string; orderIdx?: number },
): Promise<ProjectBoard> {
  return apiRequest<ProjectBoard>("/project-board/boards", {
    method: "POST",
    body,
    token,
    errorMessage: "프로젝트 게시판을 만들지 못했습니다.",
  });
}

export function updateProjectBoard(
  token: string,
  boardId: string,
  body: { name?: string; description?: string; orderIdx?: number },
): Promise<ProjectBoard> {
  return apiRequest<ProjectBoard>(`/project-board/boards/${boardId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "프로젝트 게시판을 저장하지 못했습니다.",
  });
}

export function deleteProjectBoard(
  token: string,
  boardId: string,
): Promise<{ success: boolean; id: string }> {
  return apiRequest<{ success: boolean; id: string }>(
    `/project-board/boards/${boardId}`,
    {
      method: "DELETE",
      token,
      errorMessage: "프로젝트 게시판을 삭제하지 못했습니다.",
    },
  );
}

export function listProjectBoardPosts(
  token: string,
  boardId: string,
  params: { q?: string },
): Promise<ProjectBoardPostSummary[]> {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  const query = search.toString();
  return apiRequest<ProjectBoardPostSummary[]>(
    query
      ? `/project-board/boards/${boardId}/posts?${query}`
      : `/project-board/boards/${boardId}/posts`,
    {
      token,
      errorMessage: "게시글을 불러오지 못했습니다.",
    },
  );
}

export function createProjectBoardPost(
  token: string,
  boardId: string,
  body: { title: string; content?: string },
): Promise<ProjectBoardPostDetail> {
  return apiRequest<ProjectBoardPostDetail>(
    `/project-board/boards/${boardId}/posts`,
    {
      method: "POST",
      body,
      token,
      errorMessage: "게시글을 만들지 못했습니다.",
    },
  );
}

export function getProjectBoardPost(
  token: string,
  postId: string,
): Promise<ProjectBoardPostDetail> {
  return apiRequest<ProjectBoardPostDetail>(`/project-board/posts/${postId}`, {
    token,
    errorMessage: "게시글 상세를 불러오지 못했습니다.",
  });
}

export function updateProjectBoardPost(
  token: string,
  postId: string,
  body: { title?: string; content?: string },
): Promise<ProjectBoardPostDetail> {
  return apiRequest<ProjectBoardPostDetail>(`/project-board/posts/${postId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "게시글을 저장하지 못했습니다.",
  });
}

export function deleteProjectBoardPost(
  token: string,
  postId: string,
): Promise<{ success: boolean; id: string; boardId: string }> {
  return apiRequest<{ success: boolean; id: string; boardId: string }>(
    `/project-board/posts/${postId}`,
    {
      method: "DELETE",
      token,
      errorMessage: "게시글을 삭제하지 못했습니다.",
    },
  );
}
