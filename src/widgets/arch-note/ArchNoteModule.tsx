import * as archNoteApi from "../../features/arch-note/api";
import HierarchicalDocumentModule, {
  type HierarchicalDocumentCopy,
} from "../../features/hierarchical-document/HierarchicalDocumentModule";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";

const ARCH_NOTE_COPY: HierarchicalDocumentCopy = {
  pageTitle: "아키텍처 노트",
  introTitle: "아키텍처 노트를 시작하세요",
  introDescription:
    "백엔드 · 프론트엔드 · DevOps 처럼 분류별 워크스페이스를 만들어 정리합니다.",
  workspacePlaceholder: "워크스페이스 이름 (예: 백엔드)",
  newItemTitle: "새 노트",
  itemName: "노트",
  editorPlaceholder: "노트를 작성하세요...",
};

function ArchNoteModule() {
  const topicWidth = useAppSettingsStore((s) => s.archNoteTopicWidth);
  const setTopicWidth = useAppSettingsStore((s) => s.setArchNoteTopicWidth);
  const sectionWidth = useAppSettingsStore((s) => s.archNoteSectionWidth);
  const setSectionWidth = useAppSettingsStore(
    (s) => s.setArchNoteSectionWidth,
  );

  return (
    <HierarchicalDocumentModule
      api={archNoteApi}
      copy={ARCH_NOTE_COPY}
      topicWidth={topicWidth}
      setTopicWidth={setTopicWidth}
      sectionWidth={sectionWidth}
      setSectionWidth={setSectionWidth}
    />
  );
}

export default ArchNoteModule;
