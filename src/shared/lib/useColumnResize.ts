import { useCallback, useEffect, useRef } from "react";

// 사이드바 폭을 드래그로 조절하는 훅. width/onChange는 보통 zustand persist 스토어에 연결해
// 리사이즈 결과가 재시작 후에도 남게 한다.
export function useColumnResize(
  width: number,
  onChange: (width: number) => void,
  { min = 160, max = 480 }: { min?: number; max?: number } = {},
) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      onChange(Math.min(max, Math.max(min, startWidthRef.current + delta)));
    }
    function onMouseUp() {
      draggingRef.current = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onChange, min, max]);

  return useCallback(
    (e: React.MouseEvent) => {
      draggingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      e.preventDefault();
    },
    [width],
  );
}
