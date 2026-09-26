export function pageRange(page: number, pageCount: number): { page: number; pageCount: number; hasPrevious: boolean; hasNext: boolean } {
  const safeCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safeCount);
  return {
    page: safePage,
    pageCount: safeCount,
    hasPrevious: safePage > 1,
    hasNext: safePage < safeCount,
  };
}
