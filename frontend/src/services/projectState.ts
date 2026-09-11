import type { DemoDataset } from "./demoDatasets";

type Listener = () => void;
const listeners: Listener[] = [];
export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}
function notify() {
  listeners.forEach((l) => l());
}

let currentFile: string | null = null;
let processedFile: string | null = null;

export function setCurrentFile(filename: string) {
  currentFile = filename;
  notify();
}
export function getCurrentFile() {
  return currentFile;
}
export function setProcessedFile(filename: string) {
  processedFile = filename;
  notify();
}
export function getProcessedFile() {
  return processedFile;
}

/* -------------------------------------------------------------------------
   TEMPORARY DEMO STATE — see services/demoDatasets.ts for why this exists.
   When activeDemo is set, Super Resolution and the Enhanced Image page use
   this instead of calling the real backend. Any real (non-demo) file never
   touches these fields.
------------------------------------------------------------------------- */
let activeDemo: DemoDataset | null = null;
let demoInputPreviewUrl: string | null = null;
let demoSuperResolutionDone = false;

export function setActiveDemo(dataset: DemoDataset | null) {
  activeDemo = dataset;
  notify();
}
export function getActiveDemo() {
  return activeDemo;
}
export function setDemoInputPreviewUrl(url: string | null) {
  demoInputPreviewUrl = url;
  notify();
}
export function getDemoInputPreviewUrl() {
  return demoInputPreviewUrl;
}
export function setDemoSuperResolutionDone(done: boolean) {
  demoSuperResolutionDone = done;
  notify();
}
export function getDemoSuperResolutionDone() {
  return demoSuperResolutionDone;
}

export function clearProjectState() {
  currentFile = null;
  processedFile = null;
  activeDemo = null;
  demoInputPreviewUrl = null;
  demoSuperResolutionDone = false;
  notify();
}
