# 문서 관리 (Finder-like) 구현 계획

> 로컬 폴더를 앱 안에서 Finder처럼 탐색 + 미리보기 + 즐겨찾기.
> 레일의 **문서** placeholder → 실제 모듈로 승격.

---

## 1. 목표 / 범위

- 사용자가 고른 **루트 폴더**를 트리/리스트로 탐색
- 더블클릭 → 기본 앱으로 열기 (또는 앱 내 미리보기)
- 텍스트/마크다운/이미지 **인앱 미리보기**
- **즐겨찾기** — 항목을 드래그해서 추가, 영구 저장
- 폴더 변경 **실시간 반영**(watch)

비범위(추후): 파일 편집, 이름변경/삭제/이동(CRUD)은 v2, 네이티브 썸네일은 옵션.

---

## 2. 사용 플러그인 / 권한

| 용도 | 플러그인 | 비고 |
|---|---|---|
| 폴더 선택 | `@tauri-apps/plugin-dialog` | `open({ directory: true })` |
| 파일시스템 | `@tauri-apps/plugin-fs` | `readDir` / `stat` / `readTextFile` / `readFile` / `watch` |
| 파일 열기 | `@tauri-apps/plugin-opener` | **이미 설치됨** |
| 즐겨찾기 저장 | `@tauri-apps/plugin-store` 또는 appData JSON | 경로 목록 영속화 |

**권한(capabilities/default.json)** — Tauri v2 보안 모델상 명시 필요:
- `dialog:default`
- `fs:default` + 스코프 (사용자가 dialog로 고른 폴더 트리 허용)
- `opener:default`

> 설치: `npm i @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-store`
> Rust(`Cargo.toml`) + `lib.rs`에 각 플러그인 `.plugin(tauri_plugin_fs::init())` 등록.

---

## 3. 구조 (FSD)

```
src/
  features/files/
    api.ts              # fs 래퍼: listDir, statEntry, readPreview, openExternal
    useDirWatcher.ts    # plugin-fs watch → 변경 시 갱신
    favorites.ts        # 즐겨찾기 load/save (store)
    types.ts            # FileEntry { name, path, isDir, size, mtime, ext }
  widgets/documents/
    DocumentsPage.tsx   # 레일 '문서' 모듈 진입점 (3-pane)
    FolderTree.tsx      # 좌: 폴더 트리
    FileList.tsx        # 중: 현재 폴더 항목 리스트
    PreviewPane.tsx     # 우: 미리보기
    FavoritesBar.tsx    # 즐겨찾기 (드롭 타깃)
```

레일 라우팅: `AppShell`의 `active === "docs"` → `<DocumentsPage />` (현재 PlaceholderModule 대체).

---

## 4. 레이아웃

```
┌ PageHeader: [📁 문서]  [폴더 선택]  ...........  (창버튼) ┐
├──────────────┬───────────────────┬───────────────────┤
│ 즐겨찾기       │  파일 리스트         │   미리보기          │
│ (드롭 타깃)    │  (브레드크럼 +      │   (텍스트/MD/이미지) │
│ 폴더 트리      │   항목 목록)        │                   │
└──────────────┴───────────────────┴───────────────────┘
```

- 공통 `PageHeader` 재사용 (헤더/보더 일관성)
- 아이콘: 확장자 → 자체 매핑(📄 📁 🖼️ 📊 …). 네이티브 썸네일은 옵션.

---

## 5. 데이터 흐름

1. **폴더 선택** → `dialog.open({directory:true})` → rootPath 저장
2. `readDir(path)` → `FileEntry[]` (각 항목 `stat`으로 size/mtime 보강)
3. 폴더 클릭 → 하위 `readDir`, 브레드크럼 갱신
4. 파일 클릭 → 미리보기(텍스트/MD/이미지) / 더블클릭 → `opener.open(path)`
5. `watch(rootPath)` → 변경 이벤트 → 현재 폴더 갱신

---

## 6. 즐겨찾기 (드래그)

- **앱 내부 DnD** (HTML5 `draggable`): FileList 항목 → FavoritesBar 드롭 → 경로 추가
- 저장: `plugin-store`(`favorites.json`)에 경로 배열 — 재시작해도 유지
- 즐겨찾기 클릭 → 해당 경로로 점프 / 우클릭(또는 ✕) → 제거
- (옵션) **Finder → 앱 드롭**: `getCurrentWebview().onDragDropEvent()`로 외부 파일 경로 받아 추가

---

## 7. 단계 (Phase)

- **P0 — 뼈대**: 플러그인 설치 + 권한 + `docs` 라우팅 + 폴더 선택 → 리스트 1단
- **P1 — 탐색**: 폴더 진입/브레드크럼, 정렬, 더블클릭 열기(opener)
- **P2 — 미리보기**: 텍스트/MD/이미지 PreviewPane
- **P3 — 즐겨찾기**: 앱 내부 드래그 + store 저장
- **P4 — 실시간**: watch 연동, (옵션) Finder 드롭, 검색
- **(옵션) P5**: 이름변경/삭제/이동, 네이티브 썸네일(Rust NSWorkspace)

---

## 8. 주의

- **권한 스코프**: 임의 경로 무제한 읽기는 지양 — 사용자가 고른 루트 트리로 한정
- **대용량 폴더**: 항목 많으면 가상 스크롤 고려(P4 이후)
- **경로 인코딩**: 공백/한글 경로 정상 처리 확인
- 서버 불필요 — **완전 로컬**. (메신저와 달리 백엔드 의존 없음)
