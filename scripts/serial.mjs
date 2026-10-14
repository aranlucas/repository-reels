// Browser sessions, media encoders and provider requests must stay one-at-a-time.
export async function runSequential(items, action) {
  let pending = Promise.resolve();

  for (const item of items) {
    pending = pending.then(() => action(item));
  }

  await pending;
}
