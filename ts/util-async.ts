/**
 * Represents the result of calling the `asyncForEach` function.
 * @param appender {(a: T[]) => Promise<void>} - A function to add more elements to the array
 * @param promise {Promise<void>} - A promise that resolves when the loop has completed
 */
export interface AsyncForEachResult<T> {
    appender: (a: T[]) => Promise<void>;
    promise: Promise<void>;
}

/**
 * A function that is called after each batch of work in an asynchronous for-each loop to provide progress updates.
 * @param remaining {number} - The number of elements remaining in the loop
 * @param total {number} - The total number of elements in the loop
 */
type AsyncProgressUpdate = (remaining: number, total: number) => void;

/**
 * Performs an asynchronous for-each loop over an array of elements, `a`, and
 * calls a function `func` on each element.
 *
 * The loop is implemented using a Promise that schedules itself to perform work
 * in batches, pausing and rescheduling itself after `timeLimit`ms. This allows
 * the browser to perform updates such as rendering changes to the user
 * interface.
 *
 * An optional progress update function `updateFunc` can be provided to be
 * called after each batch of work with the `remaining` number of elements and
 * the `total` number of elements as arguments.
 *
 * An optional completion function `thenClause` can also be provided to be
 * called when the loop has finished.
 * @param {T[]} a - The array of elements to loop over
 * @param {function(e: T): void} func - The function to be called on each element
 * @param {AsyncProgressUpdate} updateFunc - An optional function to be called
 * after each batch of work with the remaining number of elements and the total
 * number of elements as arguments
 * @param {function(): void} thenClause - An optional function to be called when
 * the loop has completed
 * @param {number} [timeLimit=15] - An optional time limit in milliseconds.
 * Defaults to 15ms.
 * @param {number} [firstUpdate=200] - An optional time limit for the first
 * batch of work. Defaults to 200ms.
 * @return {AsyncForEachResult<T>} - An object with a property `promise` that
 * resolves when the loop has completed and a function `appender` to add more
 * elements to the array and continue the loop
 */
export function asyncForEach<T>(
    a: T[],
    func: (e: T) => void,
    updateFunc?: AsyncProgressUpdate,
    thenClause?: () => void,
    timeLimit = 15,
    firstUpdate = 200,
): AsyncForEachResult<T> {
    const promise = () => new Promise<void>((resolve, reject) => {
        let updateTime = performance.now() + firstUpdate;
        const fun = () => {
            try {
                updateTime = Math.max(updateTime, performance.now() + timeLimit);
                while (remaining.length > 0) {
                    const e = remaining.shift();
                    if (!e) continue;
                    func(e);
                    if (performance.now() > updateTime && remaining.length > 0) {
                        if (updateFunc) {
                            updateFunc(remaining.length, total);
                        }
                        setTimeout(fun, 0);
                        return;
                    }
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        };
        setTimeout(fun, 0);
    }).then(thenClause);
    let remaining = a.concat();
    let total = remaining.length;
    let p = promise();
    const appender = (elements: T[]) => {
        if (remaining.length !== 0) {
            Array.prototype.push.apply(remaining, elements);
            total += elements.length;
            return p;
        }
        remaining = elements.concat();
        total = remaining.length;
        p = promise();
        return p;
    };
    return {
        appender: appender,
        promise: p,
    };
}
