import { apiRequest } from "../../shared/api/client";

export type TaskWorkspace = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  orderIdx: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  openTaskCount: number;
};

export type TaskType =
  | "FEATURE"
  | "BUG"
  | "DOCS"
  | "DESIGN"
  | "REFACTOR"
  | "QA"
  | "CHORE";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "HOLD";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskScope = "TEAM" | "PERSONAL";
export type TaskVisibility = "TEAM" | "PRIVATE";

export type Task = {
  id: string;
  title: string;
  content: string;
  acceptanceCriteria: string;
  plan: string;
  folderStructure: string;
  mmdContent: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  scope: TaskScope;
  visibility: TaskVisibility;
  reporterId: string;
  reporterName?: string | null;
  reporterEmail?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  completedById?: string | null;
  completedByName?: string | null;
  completedAt?: string | null;
  dueDate?: string | null;
  orderIdx: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskChecklist = {
  id: string;
  taskId: string;
  content: string;
  completed: boolean;
  orderIdx: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskActivityType =
  | "CREATED"
  | "STATUS"
  | "ASSIGNEE"
  | "PRIORITY"
  | "UPDATED"
  | "ARCHIVED"
  | "RESTORED";

export type TaskActivityLog = {
  id: string;
  taskId: string;
  actorId?: string | null;
  actorName?: string | null;
  activityType: TaskActivityType;
  fromValue?: string | null;
  toValue?: string | null;
  message?: string | null;
  createdAt: string;
};

export type TaskListResponse = {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
};

export type TaskFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  scope?: "all" | "my" | "user";
  userId?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  archived?: boolean;
  sort?: "order" | "recent" | "oldest" | "dueDate" | "priority";
};

export type CreateTaskRequest = {
  title: string;
  content?: string;
  acceptanceCriteria?: string;
  plan?: string;
  folderStructure?: string;
  mmdContent?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  scope?: TaskScope;
  visibility?: TaskVisibility;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export type UpdateTaskRequest = Partial<CreateTaskRequest>;

function toSearchParams(filters?: TaskFilters) {
  const params = new URLSearchParams();
  if (!filters) return params;

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  return params;
}

export function listTaskWorkspaces(
  token: string,
  filters?: Pick<TaskFilters, "scope" | "userId" | "archived">,
): Promise<TaskWorkspace[]> {
  const params = toSearchParams(filters);
  const query = params.toString();
  return apiRequest<TaskWorkspace[]>(
    `/tasks/workspaces${query ? `?${query}` : ""}`,
    {
      token,
      errorMessage: "업무 워크스페이스를 불러오지 못했습니다.",
    },
  );
}

export function listWorkspaceTasks(
  token: string,
  workspaceId: string,
  filters?: TaskFilters,
): Promise<TaskListResponse> {
  const params = toSearchParams(filters);
  const query = params.toString();
  return apiRequest<TaskListResponse>(
    `/tasks/workspaces/${workspaceId}/tasks${query ? `?${query}` : ""}`,
    {
      token,
      errorMessage: "업무 목록을 불러오지 못했습니다.",
    },
  );
}

export function getTaskDetail(token: string, taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    token,
    errorMessage: "업무 상세를 불러오지 못했습니다.",
  });
}

export function createWorkspaceTask(
  token: string,
  workspaceId: string,
  body: CreateTaskRequest,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/workspaces/${workspaceId}/tasks`, {
    method: "POST",
    body,
    token,
    errorMessage: "업무를 생성하지 못했습니다.",
  });
}

export function updateTask(
  token: string,
  taskId: string,
  body: UpdateTaskRequest,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "업무를 저장하지 못했습니다.",
  });
}

export function listTaskChecklists(
  token: string,
  taskId: string,
): Promise<TaskChecklist[]> {
  return apiRequest<TaskChecklist[]>(`/tasks/${taskId}/checklists`, {
    token,
    errorMessage: "체크리스트를 불러오지 못했습니다.",
  });
}

export function createTaskChecklist(
  token: string,
  taskId: string,
  content: string,
): Promise<TaskChecklist> {
  return apiRequest<TaskChecklist>(`/tasks/${taskId}/checklists`, {
    method: "POST",
    body: { content },
    token,
    errorMessage: "체크리스트를 추가하지 못했습니다.",
  });
}

export function toggleTaskChecklist(
  token: string,
  taskId: string,
  checklistId: string,
): Promise<TaskChecklist> {
  return apiRequest<TaskChecklist>(
    `/tasks/${taskId}/checklists/${checklistId}/toggle`,
    {
      method: "PATCH",
      token,
      errorMessage: "체크리스트 상태를 변경하지 못했습니다.",
    },
  );
}

export function listTaskComments(
  token: string,
  taskId: string,
): Promise<TaskComment[]> {
  return apiRequest<TaskComment[]>(`/tasks/${taskId}/comments`, {
    token,
    errorMessage: "댓글을 불러오지 못했습니다.",
  });
}

export function createTaskComment(
  token: string,
  taskId: string,
  content: string,
): Promise<TaskComment> {
  return apiRequest<TaskComment>(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: { content },
    token,
    errorMessage: "댓글을 등록하지 못했습니다.",
  });
}

export function listTaskActivity(
  token: string,
  taskId: string,
): Promise<TaskActivityLog[]> {
  return apiRequest<TaskActivityLog[]>(`/tasks/${taskId}/activity`, {
    token,
    errorMessage: "업무 활동을 불러오지 못했습니다.",
  });
}

export function updateTaskStatus(
  token: string,
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/status`, {
    method: "PATCH",
    body: { status },
    token,
    errorMessage: "업무 상태를 변경하지 못했습니다.",
  });
}

export function updateTaskPriority(
  token: string,
  taskId: string,
  priority: TaskPriority,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/priority`, {
    method: "PATCH",
    body: { priority },
    token,
    errorMessage: "업무 우선순위를 변경하지 못했습니다.",
  });
}

export function archiveTasks(
  token: string,
  ids: string[],
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/tasks/archive", {
    method: "POST",
    body: { ids },
    token,
    errorMessage: "업무를 보관하지 못했습니다.",
  });
}
