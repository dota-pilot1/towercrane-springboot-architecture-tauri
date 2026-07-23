import { apiRequest } from "../../shared/api/client";

export type OrgMember = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: "admin" | "user";
  profileImageUrl: string | null;
};

export type OrgNode = {
  id: string;
  name: string;
  members: OrgMember[];
  children: OrgNode[];
};

export async function getOrgTree(token: string): Promise<OrgNode[]> {
  return apiRequest<OrgNode[]>("/org/tree", {
    token,
    errorMessage: "조직도를 불러오지 못했습니다.",
  });
}
