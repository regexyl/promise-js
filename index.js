const STATUS = {
  PENDING: "pending",
  FULFILLED: "fulfilled",
  REJECTED: "rejected",
};

const isThenable = (maybePromise) =>
  maybePromise && typeof maybePromise.then == "function";

export default class MyPromise {
  constructor(executor) {
    this.status = STATUS.PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.thenQueue = [];

    if (typeof executor === "function") {
      // TODO: Might try a microtask instead of setTimeout (macrotask)
      setTimeout(() => {
        try {
          executor(this._resolve.bind(this), this._reject.bind(this));
        } catch (err) {
          this._reject(err);
        }
      });
    }
  }

  then(onFulfilled, onRejected) {
    const nextPromise = new MyPromise();
    this.thenQueue.push([nextPromise, onFulfilled, onRejected]);

    if (this.status === STATUS.FULFILLED) {
      this._onFulfilled();
    } else if (this.status === STATUS.REJECTED) {
      this._onRejected();
    }

    return nextPromise;
  }

  catch(onRejected) {
    const nextPromise = new MyPromise();
    this.thenQueue.push([nextPromise, undefined, onRejected]);

    if (this.status === STATUS.REJECTED) {
      this._onRejected();
    }

    return nextPromise;
  }

  _onFulfilled() {
    this.thenQueue.forEach(([nextPromise, onFulfilled]) => {
      if (typeof onFulfilled === "function") {
        const result = onFulfilled(this.value);

        if (isThenable(result)) {
          result.then(
            (value) => nextPromise._resolve(value),
            (reason) => nextPromise._reject(reason)
          );
        } else {
          nextPromise._resolve(result);
        }
      } else {
        nextPromise._resolve(this.value);
      }
    });

    this.thenQueue = [];
  }

  _onRejected() {
    this.thenQueue.forEach(([nextPromise, _, onRejected]) => {
      if (typeof onRejected === "function") {
        const result = onRejected(this.reason);

        if (isThenable(result)) {
          result.then(
            (value) => nextPromise._resolve(value),
            (reason) => nextPromise._reject(reason)
          );
        } else {
          nextPromise._resolve(result);
        }
      } else {
        nextPromise._reject(this.reason);
      }
    });

    this.thenQueue = [];
  }

  _resolve(value) {
    if (this.status !== STATUS.PENDING) return;
    this.status = STATUS.FULFILLED;
    this.value = value;
    this._onFulfilled();
  }

  _reject(reason) {
    if (this.status !== STATUS.PENDING) return;
    this.status = STATUS.REJECTED;
    this.reason = reason;
    this._onRejected();
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise((res) => res(value));
  }

  static reject(reason) {
    if (reason instanceof MyPromise) return reason;
    return new MyPromise((_, rej) => rej(reason));
  }
}
