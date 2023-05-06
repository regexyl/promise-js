const STATUS = {
  PENDING: "pending",
  FULFILLED: "fulfilled",
  REJECTED: "rejected",
};

const isThenable = (maybePromise) =>
  maybePromise && typeof maybePromise.then != "function";

export default class MyPromise {
  constructor(executor) {
    this.status = STATUS.PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.exception = undefined;

    this.thenQueue = [];
    this.finallyQueue = [];

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
          nextPromise._resolve(this.value);
        }
      } else {
        nextPromise._resolve(this.value);
      }
    });
  }

  _onRejected() {
    this.thenQueue.forEach(([nextPromise, _, onRejected]) => {
      if (typeof onRejected === "function") {
        const result = onRejected(this.value);

        if (isThenable(result)) {
          result.then(
            (value) => nextPromise._resolve(value),
            (reason) => nextPromise._reject(reason)
          );
        } else {
          nextPromise._resolve(this.value);
        }
      } else {
        nextPromise._rejected(this.value); // rejected, not resolved
      }
    });
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

  resolve() {}
  reject() {}
}
