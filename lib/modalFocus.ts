export const MODAL_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

type FocusCandidate = Pick<HTMLElement,
  'closest' | 'focus' | 'getAttribute' | 'getClientRects' | 'tagName'>;

type FocusContainer = Pick<HTMLElement, 'querySelectorAll'>;

export function getModalFocusableElements(container: FocusContainer): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR))
    .filter((element: FocusCandidate) => {
      const closedDetails = element.closest('details:not([open])');
      return (
        element.getAttribute('aria-hidden') !== 'true'
        && element.getClientRects().length > 0
        && (!closedDetails || element.tagName === 'SUMMARY')
      );
    });
}

export function getModalTabWrapTarget<T>(
  focusableElements: T[],
  activeElement: T | null,
  shiftKey: boolean,
): T | null {
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  if (!first || !last) return null;
  if (activeElement === null || !focusableElements.includes(activeElement)) {
    return shiftKey ? last : first;
  }
  if (shiftKey && activeElement === first) return last;
  if (!shiftKey && activeElement === last) return first;
  return null;
}

export function isModalDismissKey(key: string): boolean {
  return key === 'Escape';
}
