import HierarchicalDocumentModule, {
  type HierarchicalDocumentCopy,
} from "../../features/hierarchical-document/HierarchicalDocumentModule";
import * as projectCodeReviewApi from "../../features/project-code-review/api";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";

const PROJECT_CODE_REVIEW_COPY: HierarchicalDocumentCopy = {
  pageTitle: "프로젝트 코드리뷰",
  introTitle: "프로젝트 코드리뷰를 시작하세요",
  introDescription:
    "프로젝트별 워크스페이스를 만들고 리뷰 기준, 체크리스트, 회고 노트를 정리합니다.",
  workspacePlaceholder: "프로젝트 이름 (예: JWT 로그인 리뷰)",
  newItemTitle: "새 리뷰 노트",
  itemName: "리뷰 노트",
  editorPlaceholder: "코드리뷰 내용을 작성하세요...",
};

function ProjectCodeReviewModule() {
  const topicWidth = useAppSettingsStore((s) => s.codeReviewTopicWidth);
  const setTopicWidth = useAppSettingsStore((s) => s.setCodeReviewTopicWidth);
  const sectionWidth = useAppSettingsStore((s) => s.codeReviewSectionWidth);
  const setSectionWidth = useAppSettingsStore(
    (s) => s.setCodeReviewSectionWidth,
  );

  return (
    <HierarchicalDocumentModule
      api={projectCodeReviewApi}
      copy={PROJECT_CODE_REVIEW_COPY}
      topicWidth={topicWidth}
      setTopicWidth={setTopicWidth}
      sectionWidth={sectionWidth}
      setSectionWidth={setSectionWidth}
    />
  );
}

export default ProjectCodeReviewModule;
