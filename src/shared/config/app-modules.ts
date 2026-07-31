import {
  Code2,
  CalendarDays,
  CheckSquare,
  DraftingCompass,
  FileText,
  Layers,
  Lightbulb,
  MessageCircle,
  MessageSquareText,
  NotebookPen,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppModuleId =
  | "messenger"
  | "chat"
  | "taskmanagement"
  | "discussionnote"
  | "projectboard"
  | "docs"
  | "archnote"
  | "planningdesign"
  | "devhistory"
  | "codereview"
  | "studydiary"
  | "ideanote"
  | "projectschedule";

export type AppModuleDefinition = {
  id: AppModuleId;
  label: string;
  description: string;
  icon: LucideIcon;
  ready: boolean;
};

export const APP_MODULES: AppModuleDefinition[] = [
  {
    id: "messenger",
    label: "메신저",
    description: "개인 메시지를 주고받습니다.",
    icon: MessageCircle,
    ready: true,
  },
  {
    id: "chat",
    label: "채팅",
    description: "팀 채널과 회의를 관리합니다.",
    icon: Users,
    ready: true,
  },
  {
    id: "taskmanagement",
    label: "업무 관리",
    description: "내 업무 워크스페이스와 할 일을 관리합니다.",
    icon: CheckSquare,
    ready: true,
  },
  {
    id: "discussionnote",
    label: "의사결정",
    description: "논의 주제, 댓글, 결정 요약을 관리합니다.",
    icon: NotebookPen,
    ready: true,
  },
  {
    id: "projectboard",
    label: "게시판",
    description: "게시판과 게시글로 프로젝트 논의를 정리합니다.",
    icon: MessageSquareText,
    ready: true,
  },
  {
    id: "docs",
    label: "문서 관리",
    description: "공용 문서를 탐색하고 관리합니다.",
    icon: FileText,
    ready: true,
  },
  {
    id: "archnote",
    label: "아키텍처",
    description: "아키텍처 워크스페이스를 관리합니다.",
    icon: Layers,
    ready: true,
  },
  {
    id: "planningdesign",
    label: "기획·설계",
    description: "기획과 설계 문서를 관리합니다.",
    icon: DraftingCompass,
    ready: true,
  },
  {
    id: "codereview",
    label: "코드리뷰",
    description: "프로젝트 코드리뷰를 관리합니다.",
    icon: Code2,
    ready: true,
  },
  {
    id: "studydiary",
    label: "스터디 노트",
    description: "학습 주제와 노트를 정리합니다.",
    icon: FileText,
    ready: true,
  },
  {
    id: "ideanote",
    label: "아이디어 노트",
    description: "아이디어와 가설을 정리합니다.",
    icon: Lightbulb,
    ready: true,
  },
  {
    id: "projectschedule",
    label: "개발 일정",
    description: "개발 일정과 기간을 달력에서 관리합니다.",
    icon: CalendarDays,
    ready: true,
  },
  {
    id: "devhistory",
    label: "개발 일지",
    description: "개발 진행 상황과 회고를 정리합니다.",
    icon: NotebookPen,
    ready: true,
  },
];

export const DEFAULT_MODULE_ORDER = APP_MODULES.map((module) => module.id);

export function isAppModuleId(value: string): value is AppModuleId {
  return DEFAULT_MODULE_ORDER.includes(value as AppModuleId);
}
