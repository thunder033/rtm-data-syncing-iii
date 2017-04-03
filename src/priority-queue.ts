'use strict';
/**
 * Created by gjrwcs on 2/21/2017.
 */

class QueueNode {
    public priority: number;
    public item: any;
    public next: QueueNode;

    /**
     * Priority Queue Node
     * @param priority
     * @param item
     */
    constructor(priority: number, item: any) {
        this.priority = priority;
        this.item = item;
        this.next = null;
    }
}

class QueueIterator implements Iterator<QueueNode> {

    private current: QueueNode;

    /**
     * Priority Queue Iterator
     * @param root
     * @constructor
     */
    constructor(root: QueueNode) {
        this.current = root;
    }

    /**
     * Traverses the iterator to the next node and returns its item
     * @returns {*}
     */
    public next(): any {
        if (this.current) {
            const node = this.current;
            this.current = node.next;
            return node.item;
        }

        return null;
    }

    /**
     * Indicates if the iterator has traversed all nodes
     * @returns {boolean}
     */
    public isEnd(): boolean {
        return this.current === null;
    }

    public resetRoot(root: QueueNode): void {
        this.current = root;
    }
}

/**
 * Priority Queue
 * lower priority items (close to 0) will be dequeued first
 */
export class PriorityQueue {

    private root: QueueNode;
    private iterator: QueueIterator;

    constructor() {
        this.root = null;
        this.iterator = null;
    }

    /**
     * Add a new item to the queue according to the given priority
     * Items with priority equal an existing node will be enqueued after those node
     * @param {number} priority
     * @param {*} item
     */
    public enqueue(priority: number, item: any): void {
        const node = new QueueNode(priority, item);
        if (this.root === null) {
            this.root = node;
        } else if (priority < this.root.priority) {
            node.next = this.root;
            this.root = node;
        } else {
            let current: QueueNode = this.root;
            while (current.next !== null) {
                if (priority >= current.next.priority) {
                    current = current.next;
                } else {
                    node.next = current.next;
                    current.next = node;
                    return;
                }
            }

            current.next = node;
        }
    }

    /**
     * Finds and removes first instance the item from the queue
     * @param item {any}
     */
    public remove(item: any): void {
        let node: QueueNode = this.root;
        let prev: QueueNode = null;
        do {
            if (node.item === item) {
                if (prev !== null) {
                    prev.next = node.next;
                } else {
                    this.root = node.next;
                }

                break;
            }

            prev = node;
            node = node.next;
        } while (node !== null);
    }

    /**
     * Remove the next item from the queue
     * @returns {*}
     */
    public dequeue(): any {
        if (this.root !== null) {
            const node: QueueNode = this.root;
            this.root = node.next;
            return node.item;
        }

        return null;
    }

    /**
     * Get an iterate for the queue
     * @returns {null|Iterator}
     */
    public getIterator(): QueueIterator {
        if (this.iterator === null) {
            this.iterator = new QueueIterator(this.root);
        }

        this.iterator.resetRoot(this.root);
        return this.iterator;
    }

    /**
     * See the next item in queue
     * @returns {*|null}
     */
    public peek(): any {
        return this.root !== null ? this.root.item : null;
    }

    /**
     * Empty the queue
     */
    public clear(): void {
        this.root = null;
    }

    /**
     * Creates an array of the items in the priority queue
     * @returns {Array}
     */
    public asArray(): any[] {
        const arr: any[] = [];
        const it: QueueIterator = this.getIterator();

        while (!it.isEnd()) {
            arr.push(it.next());
        }

        return arr;
    }
}
