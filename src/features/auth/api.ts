import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { ApiError, apiRequest, getToken, setToken } from "../../shared/api/client";
import type { User } from "../../entities/user";

export type LoginResult = {
  token: string;
  user: User;
  expiresAt: string;
};

export { getToken, setToken };

export async function login(email: string, password: string): Promise<LoginResult> {
  let result: LoginResult;
  try {
    result = await apiRequest<LoginResult>("/auth/login", {
      method: "POST",
      body: { email, password },
      errorMessage: "로그인에 실패했습니다.",
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    throw err;
  }
  setToken(result.token);
  return result;
}

// ── 회원가입 ─────────────────────────────────────────────
// 이메일 중복 여부 확인
export async function checkEmail(email: string): Promise<{ available: boolean }> {
  return apiRequest<{ available: boolean }>(
    `/auth/check-email?email=${encodeURIComponent(email)}`,
    { errorMessage: "이메일 확인에 실패했습니다." },
  );
}

// 가입용 이메일 인증코드 발송 (6자리)
export async function sendSignupCode(email: string): Promise<void> {
  await apiRequest("/auth/email/send-code", {
    method: "POST",
    body: { email },
    errorMessage: "인증코드 발송에 실패했습니다.",
  });
}

// 가입용 인증코드 검증 → 가입에 쓸 verifiedToken 반환
export async function verifySignupCode(
  email: string,
  code: string,
): Promise<{ verifiedToken: string }> {
  return apiRequest<{ verifiedToken: string }>("/auth/email/verify-code", {
    method: "POST",
    body: { email, code },
    errorMessage: "인증코드가 올바르지 않습니다.",
  });
}

// verifiedToken으로 회원가입 완료 → 세션 즉시 발급
export async function signup(input: {
  email: string;
  password: string;
  name: string;
  verifiedToken: string;
}): Promise<LoginResult> {
  const result = await apiRequest<LoginResult>("/auth/signup", {
    method: "POST",
    body: input,
    errorMessage: "회원가입에 실패했습니다.",
  });
  setToken(result.token);
  return result;
}

// 비밀번호 재설정 — 이메일로 6자리 인증코드 발송
export async function requestPasswordResetCode(email: string): Promise<void> {
  await apiRequest("/auth/password-reset/request-code", {
    method: "POST",
    body: { email },
    errorMessage: "인증코드 발송에 실패했습니다.",
  });
}

// 인증코드 검증 → 이후 비번 변경에 쓸 verifiedToken 반환
export async function verifyPasswordResetCode(
  email: string,
  code: string,
): Promise<{ verifiedToken: string }> {
  return apiRequest<{ verifiedToken: string }>("/auth/password-reset/verify-code", {
    method: "POST",
    body: { email, code },
    errorMessage: "인증코드가 올바르지 않습니다.",
  });
}

// verifiedToken으로 새 비밀번호 설정
export async function resetPasswordWithCode(
  email: string,
  verifiedToken: string,
  newPassword: string,
): Promise<void> {
  await apiRequest("/auth/password-reset/reset-with-code", {
    method: "POST",
    body: { email, verifiedToken, newPassword },
    errorMessage: "비밀번호 변경에 실패했습니다.",
  });
}

export async function me(token: string): Promise<User> {
  return apiRequest<User>("/auth/me", {
    token,
    errorMessage: "세션이 만료되었습니다.",
  });
}

export async function updateProfileImage(
  token: string,
  profileImageUrl: string | null,
): Promise<User> {
  return apiRequest<User>("/users/me/profile-image", {
    method: "PATCH",
    token,
    body: { profileImageUrl },
    errorMessage: "프로필 이미지를 변경하지 못했습니다.",
  });
}

type PresignResult = { presignedUrl: string; publicUrl: string; key: string };

// 파일 선택 → presign 발급 → S3 PUT 업로드 → 프로필 이미지 URL 저장
export async function uploadProfileImage(token: string, file: File): Promise<User> {
  const contentType = file.type || "application/octet-stream";
  const presign = await apiRequest<PresignResult>("/upload/presign", {
    method: "POST",
    token,
    body: { filename: file.name, contentType },
    errorMessage: "이미지 업로드를 준비하지 못했습니다.",
  });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const putRes = await tauriFetch(presign.presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error("이미지 업로드에 실패했습니다.");
  }

  return updateProfileImage(token, presign.publicUrl);
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiRequest("/auth/change-password", {
    method: "POST",
    token,
    body: { currentPassword, newPassword },
    errorMessage: "비밀번호를 변경하지 못했습니다.",
  });
}

export async function logout(token: string): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST", token });
  } catch {
    // 네트워크 실패해도 로컬 토큰은 비운다
  }
  setToken(null);
}
