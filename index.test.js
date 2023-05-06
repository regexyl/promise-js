import { describe, it } from "vitest";
import MyPromise from ".";

// All tests within this suite will be run in parallel
describe("MyPromise", () => {
  it.concurrent("Vanilla promise", async ({ expect }) => {
    return new MyPromise((res) => setTimeout(() => res("One"), 100)).then(
      (value) => {
        expect(value).toBe("One");
      }
    );
  });

  it.concurrent("Then + then again", async ({ expect }) => {
    const promise1 = new MyPromise((res) => setTimeout(() => res("One"), 100));
    return promise1
      .then((value) => value + "!")
      .then((value) => {
        expect(value).toBe("One!");
      });
  });

  it.concurrent("Resolving immediately", async ({ expect }) => {
    const promise1 = new MyPromise((res) => res("One"));
    return promise1.then((value) => {
      expect(value).toBe("One");
    });
  });

  it.concurrent("Executes asynchronously", async ({ expect }) => {
    // onFulfilled and onRejected executed asynchronously with only platform code left on execution stack
    // https://github.com/promises-aplus/promises-spec
    const promise1 = new MyPromise((res) => setTimeout(() => res("One"), 100));
    let result;
    const promise2 = promise1.then((value) => {
      result = value;
      expect(result).toBe("One");
    });

    for (let i = 0; i < 1000; i++) {
      expect(result).toBe(undefined);
      continue;
    }

    return promise2;
  });

  it.concurrent(
    "Promise.resolve returns a thenable which inherits the resolved value",
    async ({ expect }) => {
      return Promise.resolve(1).then((value) => expect(value).toBe(1));
    }
  );

  it.concurrent(
    "Promise.reject returns a thenable which inherits the rejected value",
    async ({ expect }) => {
      return Promise.reject(1).then(
        () => {},
        (reason) => expect(reason).toBe(1)
      );
    }
  );

  it.concurrent(
    "Non-function parameters in .then() should be ignored",
    async ({ expect }) => {
      const promise1 = Promise.resolve(1)
        .then(2)
        .then((value) => expect(value).toBe(1));
      const promise2 = Promise.reject(1)
        .then(2, 2)
        .then(
          () => {},
          (reason) => expect(reason).toBe(1)
        );
      return [promise1, promise2];
    }
  );

  it.concurrent(
    "Settled and fulfilled promise can be invoked more than once",
    async ({ expect }) => {
      return new MyPromise((res) => res(1))
        .then((value) => {
          expect(value).toBe(1);
          return 2;
        })
        .then((value) => expect(value).toBe(2));
    }
  );

  it.concurrent(
    "Unsettled and fulfilled promise can be invoked more than once",
    async ({ expect }) => {
      return new MyPromise((res) => setTimeout(() => res(1), 1000))
        .then((value) => {
          expect(value).toBe(1);
          return 2;
        })
        .then((value) => expect(value).toBe(2));
    }
  );

  // Errors should be handled at the next .catch() or rejection handler
  it.concurrent(
    "Rejected value should be handled in rejection handler or .catch()",
    async ({ expect }) => {
      const promise1 = new MyPromise((_, rej) => rej(1))
        .then((value) => value + 1)
        .then((value) => value + 1)
        .catch((reason) => expect(reason).toBe(1));
      const promise2 = new MyPromise((_, rej) => rej(2))
        .then((value) => value + 1)
        .then(
          (value) => value + 1,
          (reason) => expect(reason).toBe(2)
        );
      return [promise1, promise2];
    }
  );

  it.concurrent(
    "Rejected reason should be passed down to next rejection handler or .catch()",
    async ({ expect }) => {
      const promise1 = new MyPromise((_, rej) => rej("RejectedOne"))
        .then((value) => value + 1) // not executed
        .then(
          (value) => value + 1, // not executed
          (reason) => {
            expect(reason).toBe("RejectedOne");
            return "RejectedOne";
          } // executed
        )
        .then(
          (value) => {
            expect(value).toBe("RejectedOne");
            return value + "Again";
          }, // executed
          (reason) => reason // not executed
        )
        .then((value) => {
          expect(value).toBe("RejectedOneAgain");
          return value + "Again"; // executed
        })
        .catch((reason) =>
          expect(reason).toBe("ERR1: This test should not be executed.")
        ); // not executed

      const promise2 = new MyPromise((_, rej) => rej("RejectedTwo"))
        .then((value) => value + 1) // not executed
        .catch((reason) => {
          expect(reason).toBe("RejectedTwo");
          return "RejectedTwo";
        })
        .then(
          (value) => expect(value).toBe("RejectedTwo"), // executed
          () => expect("").toBe("ERR2: This test should not be executed.") // not executed
        );
      return [promise1, promise2];
    }
  );

  it.concurrent(
    "Error should be caught at first .catch() or a rejection callback in .then()",
    async ({ expect }) => {
      let errorMessage;
      return new MyPromise((_, rej) => {
        rej("Rejected");
      })
        .then((value) => {
          return value + 1;
        })
        .then(
          (value) => {
            return value + 1;
          },
          (reason) => {
            expect(reason).toBe("Rejected");
            return "Post-rejection";
          }
        )
        .then((value) => {
          expect(value).toBe("Post-rejection");
          return "Post-" + value;
        })
        .catch((error) => (errorMessage = `NotTheRejectedMessage: ${error}`));
    }
  );

  // JS has had many implementations of promises, but all of them
  // implement the Thenable interface at the minimum
  it.concurrent("Thenables can be fulfilled", async ({ expect }) => {
    const aThenable = {
      then(onFulfilled, onRejected) {
        onFulfilled({
          // The thenable is fulfilled with another thenable
          then(onFulfilled, onRejected) {
            onFulfilled(42);
          },
        });
      },
    };

    const result = MyPromise.resolve(aThenable);
    result.then((value) => expect(value).toBe(42));
  });

  it.concurrent("Thenables can be rejected", async ({ expect }) => {
    const aThenable = {
      then(onFulfilled, onRejected) {
        onRejected({
          // The thenable is fulfilled with another thenable
          then(onFulfilled, onRejected) {
            onRejected(42);
          },
        });
      },
    };

    return MyPromise.reject(aThenable).then(
      () => {},
      (reason) => expect(reason).toBe(aThenable)
    );
  });
});
