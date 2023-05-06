import { describe, it } from "vitest";

// All tests within this suite will be run in parallel
describe("Promise", () => {
  it("Vanilla promise", async ({ expect }) => {
    return new Promise((res) => setTimeout(() => res("One"), 100)).then(
      (value) => {
        expect(value).toBe("One");
      }
    );
  });

  it("Then + then again", async ({ expect }) => {
    const promise1 = new Promise((res) => setTimeout(() => res("One"), 100));
    return promise1
      .then((value) => value + "!")
      .then((value) => {
        expect(value).toBe("One!");
      });
  });

  it("Resolving immediately", async ({ expect }) => {
    const promise1 = new Promise((res) => res("One"));
    return promise1.then((value) => {
      expect(value).toBe("One");
    });
  });

  it("Executes asynchronously", async ({ expect }) => {
    // onFulfilled and onRejected executed asynchronously with only platform code left on execution stack
    // https://github.com/promises-aplus/promises-spec
    const promise1 = new Promise((res) => setTimeout(() => res("One"), 100));
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

  it("Promise.resolve returns a thenable which inherits the resolved value", async ({
    expect,
  }) => {
    return Promise.resolve(1).then((value) => expect(value).toBe(1));
  });

  it("Promise.reject returns a thenable which inherits the rejected value", async ({
    expect,
  }) => {
    return Promise.reject(1).then(
      () => {},
      (reason) => expect(reason).toBe(1)
    );
  });

  it("Non-function parameters in .then() should be ignored", async ({
    expect,
  }) => {
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
  });

  it("Settled and fulfilled promise can be invoked more than once", async ({
    expect,
  }) => {
    return new Promise((res) => res(1))
      .then((value) => {
        expect(value).toBe(1);
        return 2;
      })
      .then((value) => expect(value).toBe(2));
  });

  it("Unsettled and fulfilled promise can be invoked more than once", async ({
    expect,
  }) => {
    return new Promise((res) => setTimeout(() => res(1), 1000))
      .then((value) => {
        expect(value).toBe(1);
        return 2;
      })
      .then((value) => expect(value).toBe(2));
  });

  // If there are no handle rejection callbacks in .then(), error
  // should be handled at the final catch statement
  it("Rejected value should be handled in rejection handler or .catch()", async ({
    expect,
  }) => {
    const promise1 = new Promise((_, rej) => rej(1))
      .then((value) => value + 1)
      .then((value) => value + 1)
      .catch((reason) => expect(reason).toBe(1));
    const promise2 = new Promise((_, rej) => rej(2))
      .then((value) => value + 1)
      .then(
        (value) => value + 1,
        (reason) => expect(reason).toBe(2)
      );
    return [promise1, promise2];
  });

  it("Rejected reason should be passed down to next rejection handler or .catch()", async ({
    expect,
  }) => {
    const promise1 = new Promise((_, rej) => rej("RejectedOne"))
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
          // expect(value).toBe(undefined);
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

    const promise2 = new Promise((_, rej) => rej("RejectedTwo"))
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
  });

  it("Error should be caught immediately if rejection callbacks are included in .then()", async ({
    expect,
  }) => {
    let errorMessage;
    return new Promise((_, rej) => rej(1))
      .then((value) => value + 1)
      .then(
        (value) => value + 1,
        (reason) => {
          expect(reason).toBe("Caught: 1");
        }
      )
      .then((value) => value + 1)
      .catch((error) => (errorMessage = `Error: ${error}`));
  });

  // JS has had many implementations of promises, but all of them
  // implement the Thenable interface at the minimum
  it("Thenables can be fulfilled", async ({ expect }) => {
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

    return Promise.resolve(aThenable).then((value) => expect(value).toBe(4));
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

    return Promise.reject(aThenable).then(
      () => {},
      (reason) => expect(reason).toBe(aThenable)
    );
  });
});
