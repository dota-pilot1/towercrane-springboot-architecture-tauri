// @멘션 파싱/판별 유틸
// 토큰 규칙: '@' 뒤에 공백/@ 제외 문자 연속 (한글 이름 "오현석", 영문 "kim.dev" 등)
export const MENTION_RE = /@[^\s@]+/g;

// 내용에 나를 향한 멘션이 있는가
export function containsMention(content: string, myName: string): boolean {
  if (!content || !myName) return false;
  return content.includes(`@${myName}`);
}

// 렌더용 분해: 일반 텍스트와 멘션 토큰을 분리
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "mention"; text: string; me: boolean };

export function splitMentions(content: string, myName: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let last = 0;
  for (const match of content.matchAll(MENTION_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push({ type: "text", text: content.slice(last, idx) });
    parts.push({
      type: "mention",
      text: match[0],
      me: match[0] === `@${myName}`,
    });
    last = idx + match[0].length;
  }
  if (last < content.length) parts.push({ type: "text", text: content.slice(last) });
  return parts;
}

// 컴포저에서 캐럿 직전의 진행 중 멘션 쿼리 추출 ("@오" → "오", 없으면 null)
export function activeMentionQuery(text: string, caret: number): string | null {
  const before = text.slice(0, caret);
  const m = /(?:^|\s)@([^\s@]*)$/.exec(before);
  return m ? m[1] : null;
}
