// 앱 전역에서 공유하는 유저 도메인 모델.
// 특정 feature(auth 등)에 묶이지 않도록 entities 레이어에 둔다.
export type UserRole = "admin" | "user";

export type User = {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  role: UserRole;
  aiAccess: boolean;
  createdAt: string;
  updatedAt: string;
};
