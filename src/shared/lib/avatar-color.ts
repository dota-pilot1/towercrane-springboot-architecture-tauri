// id/이름 문자열 → 고정 HSL 색상 (디스코드처럼 사람마다 다른 색). Tailwind 팔레트 클래스 대신
// 런타임 계산 색상이라 CLAUDE.md의 raw 팔레트 금지 규칙과 무관 — 인라인 style로만 사용.
export function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  const hue = hash < 0 ? hash + 360 : hash;
  return `hsl(${hue} 55% 45%)`;
}
