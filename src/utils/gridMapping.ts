// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
/**
 * converts the X-Y position of the mouse to the moment-qubit position
 * */

export interface GridHit {
  qubitIndex: number;
  momentIndex: number;
}

/** gets the drop location of the gate and maps it to a qubit and moment index
 * Problem here is that dynamical growth of a moment (by 2-qubit gates overlapping) causes the grid to shift to right which is not yet calculated here.
 */
export function dynamicPointToGridIndices(
  clientX: number,
  clientY: number,
  gridRoot: HTMLElement
): GridHit | undefined {
  const firstCell = gridRoot.querySelector<HTMLElement>('.circuit-cell');
  if (!firstCell) return undefined;

  const firstRect = firstCell.getBoundingClientRect();
  const cellWidth = firstRect.width;
  const cellHeight = firstRect.height;

  if (cellWidth === 0 || cellHeight === 0) return undefined;

  const dx = clientX - firstRect.left + cellWidth / 2;
  const dy = clientY - firstRect.top - cellHeight / 2;

  if (dx < 0 || dy < 0) return undefined;

  const momentIndex = Math.floor(dx / cellWidth);
  const qubitIndex = Math.floor(dy / cellHeight);

  if (momentIndex < 0 || qubitIndex < 0) return undefined;

  return { qubitIndex, momentIndex };
}

export function validateAndGetDropIndices(
  e: React.DragEvent<HTMLDivElement>,
  gridRef: React.RefObject<HTMLDivElement | null>
): GridHit | undefined {
  if (!gridRef.current) return undefined;
  return dynamicPointToGridIndices(e.clientX, e.clientY, gridRef.current);
}

export function validateAndGetClickIndices(
  e: React.MouseEvent<HTMLDivElement>,
  gridRef: React.RefObject<HTMLDivElement | null>
): GridHit | undefined {
  if (!gridRef.current) return undefined;
  return dynamicPointToGridIndices(e.clientX, e.clientY, gridRef.current);
}

export function getHoveredQubitIndex(
  e: React.MouseEvent<HTMLDivElement>,
  gridRef: React.RefObject<HTMLDivElement | null>
): number | null {
  if (!gridRef.current) {
    return null;
  }

  const hit = dynamicPointToGridIndices(e.clientX, e.clientY, gridRef.current);

  if (!hit) return null;

  return hit.qubitIndex;
}

/** Gets the full grid hit (qubit and moment) from mouse position */
export function getHoveredGridHit(
  e: React.MouseEvent<HTMLDivElement>,
  gridRef: React.RefObject<HTMLDivElement | null>
): GridHit | null {
  if (!gridRef.current) return null;

  const hit = dynamicPointToGridIndices(e.clientX, e.clientY, gridRef.current);

  return hit ?? null;
}
