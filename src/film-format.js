export const compositionFormat = {
  width: 960,
  height: 540,
  fps: 12,
  duration: 12,
};

// Reviewed moments within the intro, workflow and source-change scenes.
export function sceneSampleFrames(fps) {
  return [0.75, 5, 9].map((seconds) => Math.round(seconds * fps));
}
