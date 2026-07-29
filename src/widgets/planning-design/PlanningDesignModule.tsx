import HierarchicalDocumentModule, {
  type HierarchicalDocumentCopy,
} from "../../features/hierarchical-document/HierarchicalDocumentModule";
import * as planningDesignApi from "../../features/planning-design/api";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";

const PLANNING_DESIGN_COPY: HierarchicalDocumentCopy = {
  pageTitle: "기획·설계",
  introTitle: "기획·설계 문서를 시작하세요",
  introDescription:
    "제품 · 서비스 · 화면 단위로 워크스페이스를 만들고 기획과 디자인 계획을 정리합니다.",
  workspacePlaceholder: "워크스페이스 이름 (예: 신규 서비스)",
  newItemTitle: "새 기획·설계 문서",
  itemName: "문서",
  editorPlaceholder: "기획과 디자인 계획을 작성하세요...",
};

function PlanningDesignModule() {
  const topicWidth = useAppSettingsStore((s) => s.planningDesignTopicWidth);
  const setTopicWidth = useAppSettingsStore(
    (s) => s.setPlanningDesignTopicWidth,
  );
  const sectionWidth = useAppSettingsStore(
    (s) => s.planningDesignSectionWidth,
  );
  const setSectionWidth = useAppSettingsStore(
    (s) => s.setPlanningDesignSectionWidth,
  );

  return (
    <HierarchicalDocumentModule
      api={planningDesignApi}
      copy={PLANNING_DESIGN_COPY}
      topicWidth={topicWidth}
      setTopicWidth={setTopicWidth}
      sectionWidth={sectionWidth}
      setSectionWidth={setSectionWidth}
    />
  );
}

export default PlanningDesignModule;
