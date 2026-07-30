import { apiRequest } from "../../shared/api/client";

export type DiscussionNoteStatus =
  | "OPEN"
  | "DISCUSSING"
  | "DECIDED"
  | "ON_HOLD"
  | "CLOSED";

export type DiscussionNotePriority = "LOW" | "MEDIUM" | "HIGH";

export type DiscussionNoteSummary = {
  id: string;
  title: string;
  content: string;
  decisionSummary: string;
  status: DiscussionNoteStatus;
  priority: DiscussionNotePriority;
  createdBy: string;
  createdByName: string;
  commentCount: number;
  lastCommentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiscussionNoteComment = {
  id: string;
  discussionNoteId: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
};

export type DiscussionNoteDetail = DiscussionNoteSummary & {
  comments: DiscussionNoteComment[];
  canEdit: boolean;
  canDelete: boolean;
};

export type DiscussionNoteListParams = {
  q?: string;
  status?: DiscussionNoteStatus | "";
};

function listQuery(params: DiscussionNoteListParams) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.status) search.set("status", params.status);
  return search.toString();
}

export function listDiscussionNotes(
  token: string,
  params: DiscussionNoteListParams,
): Promise<DiscussionNoteSummary[]> {
  const query = listQuery(params);
  return apiRequest<DiscussionNoteSummary[]>(
    query ? `/discussion-note?${query}` : "/discussion-note",
    {
      token,
      errorMessage: "의사결정 노트를 불러오지 못했습니다.",
    },
  );
}

export function getDiscussionNote(
  token: string,
  noteId: string,
): Promise<DiscussionNoteDetail> {
  return apiRequest<DiscussionNoteDetail>(`/discussion-note/${noteId}`, {
    token,
    errorMessage: "의사결정 노트를 불러오지 못했습니다.",
  });
}

export function createDiscussionNote(
  token: string,
  body: {
    title: string;
    content?: string;
    decisionSummary?: string;
    status?: DiscussionNoteStatus;
    priority?: DiscussionNotePriority;
  },
): Promise<DiscussionNoteDetail> {
  return apiRequest<DiscussionNoteDetail>("/discussion-note", {
    method: "POST",
    body,
    token,
    errorMessage: "의사결정 노트를 만들지 못했습니다.",
  });
}

export function updateDiscussionNote(
  token: string,
  noteId: string,
  body: {
    title?: string;
    content?: string;
    decisionSummary?: string;
    status?: DiscussionNoteStatus;
    priority?: DiscussionNotePriority;
  },
): Promise<DiscussionNoteDetail> {
  return apiRequest<DiscussionNoteDetail>(`/discussion-note/${noteId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "의사결정 노트를 저장하지 못했습니다.",
  });
}

export function deleteDiscussionNote(
  token: string,
  noteId: string,
): Promise<{ success: boolean; id: string }> {
  return apiRequest<{ success: boolean; id: string }>(
    `/discussion-note/${noteId}`,
    {
      method: "DELETE",
      token,
      errorMessage: "의사결정 노트를 삭제하지 못했습니다.",
    },
  );
}

export function createDiscussionNoteComment(
  token: string,
  noteId: string,
  content: string,
): Promise<DiscussionNoteComment> {
  return apiRequest<DiscussionNoteComment>(
    `/discussion-note/${noteId}/comments`,
    {
      method: "POST",
      body: { content },
      token,
      errorMessage: "댓글을 추가하지 못했습니다.",
    },
  );
}

export function updateDiscussionNoteComment(
  token: string,
  commentId: string,
  content: string,
): Promise<DiscussionNoteComment> {
  return apiRequest<DiscussionNoteComment>(
    `/discussion-note/comments/${commentId}`,
    {
      method: "PATCH",
      body: { content },
      token,
      errorMessage: "댓글을 저장하지 못했습니다.",
    },
  );
}

export function deleteDiscussionNoteComment(
  token: string,
  commentId: string,
): Promise<{ success: boolean; id: string }> {
  return apiRequest<{ success: boolean; id: string }>(
    `/discussion-note/comments/${commentId}`,
    {
      method: "DELETE",
      token,
      errorMessage: "댓글을 삭제하지 못했습니다.",
    },
  );
}
