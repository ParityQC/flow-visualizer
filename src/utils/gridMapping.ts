/**
 * converts the X-Y position of the mouse to the moment-qubit position
 * */

export interface GridHit {
  qubitIndex: number;
  momentIndex: number;
}

/** gets the drop location of the gate and maps it to a qubit and moment index.
 * Each grid cell carries its own moment/qubit via data attributes and is positioned
 * with its actual (variable) offset, so we map the point to the cell whose rect
 * contains it. This stays correct when moments are shifted right by 2-qubit-gate
 * overlap or by wide-label spacing reservations. If the point lands in a gap between
 * cells we fall back to the nearest cell.
 */
export function dynamicPointToGridIndices(
  clientX: number,
  clientY: number,
  gridRoot: HTMLElement
): GridHit | undefined {
  const cells = gridRoot.querySelectorAll<HTMLElement>('.circuit-cell');
  if (cells.length === 0) return undefined;

  let nearest: GridHit | undefined;
  let nearestDist = Infinity;

  for (const cell of cells) {
    const moment = Number(cell.dataset.moment);
    const qubit = Number(cell.dataset.qubit);
    if (Number.isNaN(moment) || Number.isNaN(qubit)) continue;

    const rect = cell.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return { qubitIndex: qubit, momentIndex: moment };
    }

    // Squared distance from the point to the cell rect (0 on either axis when inside it).
    const dx = clientX < rect.left ? rect.left - clientX : Math.max(0, clientX - rect.right);
    const dy = clientY < rect.top ? rect.top - clientY : Math.max(0, clientY - rect.bottom);
    const dist = dx * dx + dy * dy;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = { qubitIndex: qubit, momentIndex: moment };
    }
  }

  return nearest;
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
