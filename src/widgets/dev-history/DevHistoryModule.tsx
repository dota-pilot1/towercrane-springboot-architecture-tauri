import HierarchicalDocumentModule, {
  type HierarchicalDocumentCopy,
} from "../../features/hierarchical-document/HierarchicalDocumentModule";
import * as devHistoryApi from "../../features/dev-history/api";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";

const DEV_HISTORY_COPY: HierarchicalDocumentCopy = {
  pageTitle: "개발 일지",
  introTitle: "개발 일지를 시작하세요",
  introDescription:
    "프로젝트 · 기능 · 릴리즈 단위로 워크스페이스를 만들고 개발 진행 상황과 회고를 정리합니다.",
  workspacePlaceholder: "워크스페이스 이름 (예: 신규 기능)",
  newItemTitle: "새 개발 일지",
  itemName: "일지",
  editorPlaceholder: "개발 진행 내용과 회고를 작성하세요...",
};

function DevHistoryModule() {
  const topicWidth = useAppSettingsStore((s) => s.devHistoryTopicWidth);
  const setTopicWidth = useAppSettingsStore(
    (s) => s.setDevHistoryTopicWidth,
  );
  const sectionWidth = useAppSettingsStore(
    (s) => s.devHistorySectionWidth,
  );
  const setSectionWidth = useAppSettingsStore(
    (s) => s.setDevHistorySectionWidth,
  );

  return (
    <HierarchicalDocumentModule
      api={devHistoryApi}
      copy={DEV_HISTORY_COPY}
      topicWidth={topicWidth}
      setTopicWidth={setTopicWidth}
      sectionWidth={sectionWidth}
      setSectionWidth={setSectionWidth}
    />
  );
}

export default DevHistoryModule;
