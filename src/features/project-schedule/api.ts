import { apiRequest } from "../../shared/api/client";

export type ProjectSchedule = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  orderIdx: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
};

export type ProjectScheduleInput = {
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
};

export type ProjectScheduleListParams = {
  from: string;
  to: string;
};

export function listProjectSchedules(
  token: string,
  params: ProjectScheduleListParams,
): Promise<ProjectSchedule[]> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  return apiRequest<ProjectSchedule[]>(
    `/project-schedules?${search.toString()}`,
    {
      token,
      errorMessage: "일정을 불러오지 못했습니다.",
    },
  );
}

export function getProjectSchedule(
  token: string,
  scheduleId: string,
): Promise<ProjectSchedule> {
  return apiRequest<ProjectSchedule>(`/project-schedules/${scheduleId}`, {
    token,
    errorMessage: "일정 상세를 불러오지 못했습니다.",
  });
}

export function createProjectSchedule(
  token: string,
  body: ProjectScheduleInput,
): Promise<ProjectSchedule> {
  return apiRequest<ProjectSchedule>("/project-schedules", {
    method: "POST",
    body,
    token,
    errorMessage: "일정을 등록하지 못했습니다.",
  });
}

export function updateProjectSchedule(
  token: string,
  scheduleId: string,
  body: Partial<ProjectScheduleInput>,
): Promise<ProjectSchedule> {
  return apiRequest<ProjectSchedule>(`/project-schedules/${scheduleId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "일정을 저장하지 못했습니다.",
  });
}

export function deleteProjectSchedule(
  token: string,
  scheduleId: string,
): Promise<{ success: boolean; id: string }> {
  return apiRequest<{ success: boolean; id: string }>(
    `/project-schedules/${scheduleId}`,
    {
      method: "DELETE",
      token,
      errorMessage: "일정을 삭제하지 못했습니다.",
    },
  );
}

export function reorderProjectSchedules(
  token: string,
  scheduleIds: string[],
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/project-schedules/reorder", {
    method: "POST",
    body: { scheduleIds },
    token,
    errorMessage: "일정 순서를 바꾸지 못했습니다.",
  });
}
