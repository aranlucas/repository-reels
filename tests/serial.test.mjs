import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { runSequential } from "../scripts/serial.mjs";

await test("sequential jobs preserve order and never overlap", async () => {
  let active = 0;
  const events = [];

  await runSequential([1, 2, 3], async (value) => {
    active++;
    assert.equal(active, 1, "Only one provider or media operation may be active");
    events.push(`start ${value}`);
    await setImmediate();
    events.push(`end ${value}`);
    active--;
  });

  assert.deepEqual(events, ["start 1", "end 1", "start 2", "end 2", "start 3", "end 3"]);
  assert.equal(active, 0);
});

await test("a failed sequential job prevents subsequent work", async () => {
  const visited = [];
  const failure = new Error("provider rejected the request");

  await assert.rejects(
    runSequential([1, 2, 3], (value) => {
      visited.push(value);

      if (value === 2) {
        throw failure;
      }
    }),
    failure,
  );

  assert.deepEqual(visited, [1, 2]);
});

await test("an empty batch does not invoke the action", async () => {
  let calls = 0;

  await runSequential([], () => {
    calls++;
  });

  assert.equal(calls, 0);
});
