// Tauri 전용 S3 업로드 — 웹 프론트의 apiRequest(fetch/토큰자동주입)와 달리
// tauri는 apiRequest(객체 body + token 명시) + plugin-http fetch(CORS 우회)를 쓴다.
import { fetch } from "@tauri-apps/plugin-http";
import { apiRequest, getToken } from "../../../api/client";

type PresignedUrlResponse = {
  presignedUrl: string;
  publicUrl: string;
  key: string;
};

function assertPresignResponse(
  response: Partial<PresignedUrlResponse>,
): asserts response is PresignedUrlResponse {
  if (
    typeof response.presignedUrl !== "string" ||
    response.presignedUrl.length === 0
  ) {
    throw new Error(
      "Upload presign response is invalid: presignedUrl is missing.",
    );
  }

  if (typeof response.publicUrl !== "string" || response.publicUrl.length === 0) {
    throw new Error("Upload presign response is invalid: publicUrl is missing.");
  }
}

export async function uploadImageToS3(file: File): Promise<string> {
  const response = await apiRequest<Partial<PresignedUrlResponse>>(
    "/upload/presign",
    {
      method: "POST",
      body: { filename: file.name, contentType: file.type },
      token: getToken(),
    },
  );
  assertPresignResponse(response);

  const { presignedUrl, publicUrl } = response;

  // 브라우저 fetch 대신 tauri plugin-http로 PUT — 프리사인 URL 직접 업로드 시 CORS 우회
  const putResponse = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(`S3 upload failed: ${putResponse.status}`);
  }

  return publicUrl;
}
