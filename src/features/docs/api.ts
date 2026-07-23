import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { apiRequest } from "../../shared/api/client";

// 웹/서버의 /team-docs 와 동일. 폴더/문서/파일을 한 트리 노드로 통합.
export type TeamDocNodeType = "FOLDER" | "DOC" | "FILE";

export type TeamDocNode = {
  id: string;
  parentId: string | null;
  type: TeamDocNodeType;
  title: string;
  orderIdx: number;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  fileSize?: number | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function getDocTree(token: string): Promise<TeamDocNode[]> {
  return apiRequest<TeamDocNode[]>("/team-docs/tree", {
    token,
    errorMessage: "문서 목록을 불러오지 못했습니다.",
  });
}

export function getDocNode(token: string, id: string): Promise<TeamDocNode> {
  return apiRequest<TeamDocNode>(`/team-docs/${id}`, {
    token,
    errorMessage: "문서를 불러오지 못했습니다.",
  });
}

export function createDocFolder(
  token: string,
  parentId: string | null,
  title: string,
): Promise<TeamDocNode> {
  return apiRequest<TeamDocNode>("/team-docs/folders", {
    method: "POST",
    body: { parentId, title },
    token,
    errorMessage: "폴더를 만들지 못했습니다.",
  });
}

export function createDocDocument(
  token: string,
  parentId: string | null,
  title: string,
): Promise<TeamDocNode> {
  return apiRequest<TeamDocNode>("/team-docs/documents", {
    method: "POST",
    body: { parentId, title },
    token,
    errorMessage: "문서를 만들지 못했습니다.",
  });
}

export function updateDocNode(
  token: string,
  id: string,
  body: { title?: string; content?: string; parentId?: string | null },
): Promise<TeamDocNode> {
  return apiRequest<TeamDocNode>(`/team-docs/${id}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "저장하지 못했습니다.",
  });
}

export function deleteDocNode(
  token: string,
  id: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/team-docs/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function reorderDocNodes(
  token: string,
  parentId: string | null,
  items: { id: string; orderIdx: number }[],
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/team-docs/reorder", {
    method: "PATCH",
    body: { parentId, items },
    token,
    errorMessage: "순서를 바꾸지 못했습니다.",
  });
}

// presign 발급 → S3 직접 PUT → 파일 노드 등록 (이슈 첨부와 동일 흐름)
export async function uploadDocFile(
  token: string,
  parentId: string | null,
  file: File,
): Promise<TeamDocNode> {
  const contentType = file.type || "application/octet-stream";
  const presign = await apiRequest<{ presignedUrl: string; publicUrl: string }>(
    "/upload/presign",
    {
      method: "POST",
      body: { filename: file.name, contentType },
      token,
      errorMessage: "업로드 URL을 발급받지 못했습니다.",
    },
  );

  const bytes = new Uint8Array(await file.arrayBuffer());
  const putRes = await tauriFetch(presign.presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error(`파일 업로드에 실패했습니다 (${putRes.status}).`);
  }

  return apiRequest<TeamDocNode>("/team-docs/files", {
    method: "POST",
    body: {
      parentId,
      fileName: file.name,
      fileUrl: presign.publicUrl,
      contentType,
      fileSize: file.size,
    },
    token,
    errorMessage: "파일을 등록하지 못했습니다.",
  });
}
