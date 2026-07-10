/* 포트폴리오 상세 캔버스 — 사진(1~9장) 콜라주 레이아웃 템플릿 라이브러리.
   각 템플릿은 이진 분할 트리(BSP)로 정의됩니다:
     - split 노드: { split: 'x'|'y', ratio: [..], children: [..] }
       'x' = 가로로 나눔(자식이 좌우로 배치), 'y' = 세로로 나눔(자식이 상하로 배치)
       ratio는 자식들의 상대적 비율(flex-grow 값으로 그대로 사용)
     - leaf 노드: { leaf: 0..N-1 } (사진 인덱스) 또는 { leaf: 'empty' } (의도적 여백)
   트리를 그대로 중첩 flexbox로 렌더링하면 항상 빈틈 없이 캔버스가 채워지고,
   ratio만 바꿔도 다양한 구성이 나와 좌표를 직접 계산할 필요가 없습니다.
   'empty' 칸은 사진 없이 캔버스 배경색이 그대로 비치는 여백 포인트입니다.
   프로젝트 설명(제목/스펙/본문)은 이 캔버스와 별도로 옆 패널에 고정 배치되므로
   여기서는 사진 배치만 다룹니다. 어드민(admin/js/dashboard.js)과 사이트
   (assets/js/portfolio.js) 양쪽에서 같은 정의를 사용합니다. */

export const MAX_DETAIL_IMAGES = 9;

const P = (n) => ({ leaf: n });
const EMPTY = { leaf: 'empty' };
const X = (ratio, children) => ({ split: 'x', ratio, children });
const Y = (ratio, children) => ({ split: 'y', ratio, children });

export const LAYOUT_TEMPLATES = {
  1: [
    P(0),
  ],
  2: [
    X([1, 1], [P(0), P(1)]),
    Y([1, 1], [P(0), P(1)]),
  ],
  3: [
    X([2, 1], [P(0), Y([1, 1], [P(1), P(2)])]),
    Y([1, 1], [X([1, 1], [P(0), P(1)]), P(2)]),
    X([1, 1, 1], [P(0), P(1), P(2)]),
  ],
  4: [
    X([1, 1], [Y([1, 1], [P(0), P(1)]), Y([1, 1], [P(2), P(3)])]),
    X([2, 1], [P(0), Y([1, 1, 1], [P(1), P(2), P(3)])]),
    Y([2, 1], [P(0), X([1, 1, 1], [P(1), P(2), P(3)])]),
    X([3, 2], [Y([1, 3], [EMPTY, P(0)]), Y([1, 1], [P(1), X([2, 1], [P(2), P(3)])])]),
  ],
  5: [
    X([2, 1, 1], [P(0), Y([1, 1], [P(1), P(2)]), Y([1, 1], [P(3), P(4)])]),
    Y([2, 1], [P(0), X([1, 1, 1, 1], [P(1), P(2), P(3), P(4)])]),
    X([1, 1, 1, 1, 1], [P(0), P(1), P(2), P(3), P(4)]),
  ],
  6: [
    X([1, 1, 1], [Y([1, 1], [P(0), P(1)]), Y([1, 1], [P(2), P(3)]), Y([1, 1], [P(4), P(5)])]),
    X([1, 1], [Y([1, 1, 1], [P(0), P(1), P(2)]), Y([1, 1, 1], [P(3), P(4), P(5)])]),
    X([2, 1, 1], [P(0), Y([1, 1], [P(1), P(2)]), Y([1, 1, 1], [P(3), P(4), P(5)])]),
  ],
  7: [
    X([2, 1, 1, 1], [P(0), Y([1, 1], [P(1), P(2)]), Y([1, 1], [P(3), P(4)]), Y([1, 1], [P(5), P(6)])]),
    Y([1, 1], [X([1, 1, 1], [P(0), P(1), P(2)]), X([1, 1, 1, 1], [P(3), P(4), P(5), P(6)])]),
    Y([1, 2, 2], [X([1, 1, 1], [P(0), P(1), EMPTY]), X([2, 1], [P(2), P(3)]), X([2, 1], [P(4), Y([1, 1], [P(5), P(6)])])]),
  ],
  8: [
    X([2, 1, 1], [Y([1, 1], [P(0), P(1)]), Y([1, 1, 1], [P(2), P(3), P(4)]), Y([1, 1, 1], [P(5), P(6), P(7)])]),
    X([1, 1, 1], [Y([2, 1], [P(0), P(1)]), Y([1, 2], [P(2), P(3)]), Y([1, 1, 1, 1], [P(4), P(5), P(6), P(7)])]),
  ],
  9: [
    X([1, 1, 1], [Y([1, 1, 1], [P(0), P(1), P(2)]), Y([1, 1, 1], [P(3), P(4), P(5)]), Y([1, 1, 1], [P(6), P(7), P(8)])]),
    X([2, 1, 1], [P(0), Y([1, 1, 1, 1], [P(1), P(2), P(3), P(4)]), Y([1, 1, 1, 1], [P(5), P(6), P(7), P(8)])]),
  ],
};

export function getVariantCount(count) {
  const templates = LAYOUT_TEMPLATES[clampCount(count)];
  return templates ? templates.length : 0;
}

export function clampCount(count) {
  return Math.min(MAX_DETAIL_IMAGES, Math.max(1, count));
}

export function clampVariant(count, variant) {
  const total = getVariantCount(count);
  if (!total) return 0;
  return variant >= 0 && variant < total ? variant : 0;
}

export function getTemplate(count, variant) {
  const c = clampCount(count);
  const templates = LAYOUT_TEMPLATES[c];
  return templates[clampVariant(c, variant)];
}
