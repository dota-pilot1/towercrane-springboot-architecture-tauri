import HierarchicalDocumentModule, {
  type HierarchicalDocumentCopy,
} from "../../features/hierarchical-document/HierarchicalDocumentModule";
import * as ideaNoteApi from "../../features/idea-note/api";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";

const IDEA_NOTE_COPY: HierarchicalDocumentCopy = {
  pageTitle: "아이디어 노트",
  introTitle: "아이디어 노트를 시작하세요",
  introDescription:
    "제품 · 기능 · 개선안 단위로 워크스페이스를 만들고 아이디어, 가설, 레퍼런스를 정리합니다.",
  workspacePlaceholder: "워크스페이스 이름 (예: 신규 아이디어)",
  newItemTitle: "새 아이디어 노트",
  itemName: "노트",
  editorPlaceholder: "아이디어와 검토 내용을 작성하세요...",
};

function IdeaNoteModule() {
  const topicWidth = useAppSettingsStore((s) => s.ideaNoteTopicWidth);
  const setTopicWidth = useAppSettingsStore(
    (s) => s.setIdeaNoteTopicWidth,
  );
  const sectionWidth = useAppSettingsStore(
    (s) => s.ideaNoteSectionWidth,
  );
  const setSectionWidth = useAppSettingsStore(
    (s) => s.setIdeaNoteSectionWidth,
  );

  return (
    <HierarchicalDocumentModule
      api={ideaNoteApi}
      copy={IDEA_NOTE_COPY}
      topicWidth={topicWidth}
      setTopicWidth={setTopicWidth}
      sectionWidth={sectionWidth}
      setSectionWidth={setSectionWidth}
    />
  );
}

export default IdeaNoteModule;
