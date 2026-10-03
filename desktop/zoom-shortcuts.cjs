function registerZoomShortcuts(webContents) {
  webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown" || !input.control || input.alt || input.meta || input.isComposing) return;
    const zoomIn = input.key === "+" || input.key === "=" || input.code === "NumpadAdd";
    const zoomOut = input.key === "-" || input.code === "NumpadSubtract";
    const reset = input.key === "0";
    if (!zoomIn && !zoomOut && !reset) return;
    // Prevent the default menu accelerator from changing zoom a second time.
    event.preventDefault();
    const minLevel = Math.log(0.5) / Math.log(1.2);
    const maxLevel = Math.log(3) / Math.log(1.2);
    const level = reset ? 0 : webContents.getZoomLevel() + (zoomIn ? 1 : -1);
    webContents.setZoomLevel(Math.max(minLevel, Math.min(maxLevel, level)));
  });
}
module.exports = { registerZoomShortcuts };
