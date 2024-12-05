/**
 * A simple priority queue implementation.
 *
 * @see https://en.wikipedia.org/wiki/Priority_queue#:~:text=In%20computer%20science%2C%20a%20priority,before%20elements%20with%20low%20priority.
 */
export class PriorityQueue<T> {
  private heap: T[];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.heap = [];
    this.compare = compare;
  }

  private parent(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  private leftChild(index: number): number {
    return 2 * index + 1;
  }

  private rightChild(index: number): number {
    return 2 * index + 2;
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private bubbleUp(index: number): void {
    const parentIndex = this.parent(index);
    if (index > 0 && this.compare(this.heap[index], this.heap[parentIndex]) < 0) {
      this.swap(index, parentIndex);
      this.bubbleUp(parentIndex);
    }
  }

  private bubbleDown(index: number): void {
    const left = this.leftChild(index);
    const right = this.rightChild(index);
    let smallest = index;

    if (left < this.heap.length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
      smallest = left;
    }

    if (right < this.heap.length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
      smallest = right;
    }

    if (smallest !== index) {
      this.swap(index, smallest);
      this.bubbleDown(smallest);
    }
  }

  enqueue(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;

    const top = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return top;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  size(): number {
    return this.heap.length;
  }
}
