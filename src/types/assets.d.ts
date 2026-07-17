// ParityQC © 2026. See the LICENSE file in the top level directory for details.
declare module '*.css';

declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.gif' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string; // if you use SVGR, adjust to export ReactComponent too
  export default src;
}
