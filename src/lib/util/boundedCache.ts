/**
 * 간단한 LRU(Least Recently Used) 바운디드 캐시 — 순수 유틸(서버전용 아님 → 테스트 가능).
 *
 * 용도: 결정적(같은 입력 → 같은 출력)이고 비싼 계산 결과를 메모이즈.
 *  예) 쿼리 임베딩(같은 텍스트면 항상 같은 벡터)을 캐시해 반복 질문의 네트워크 왕복 제거.
 *  상한을 둬 서버 메모리 무한증가를 막는다(서버리스 인스턴스 수명 동안만 유지).
 */
export class BoundedCache<K, V> {
  private map = new Map<K, V>();
  constructor(private max: number) {
    if (max < 1) throw new Error("BoundedCache max must be >= 1");
  }

  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    // 접근 시 최신으로 갱신(LRU)
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }
}
