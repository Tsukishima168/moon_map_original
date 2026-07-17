import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getModalFocusableElements,
  getModalTabWrapTarget,
  isModalDismissKey,
} from './modalFocus.ts';

function candidate({
  hidden = false,
  visible = true,
  closedDetails = false,
  tagName = 'BUTTON',
} = {}) {
  return {
    closest: () => (closedDetails ? {} : null),
    focus: () => {},
    getAttribute: (name: string) => (name === 'aria-hidden' && hidden ? 'true' : null),
    getClientRects: () => ({ length: visible ? 1 : 0 }),
    tagName,
  };
}

test('filters hidden controls and controls inside closed details', () => {
  const close = candidate();
  const hidden = candidate({ hidden: true });
  const collapsedButton = candidate({ closedDetails: true });
  const summary = candidate({ closedDetails: true, tagName: 'SUMMARY' });
  const container = {
    querySelectorAll: () => [close, hidden, collapsedButton, summary],
  };

  assert.deepEqual(
    getModalFocusableElements(container as never),
    [close, summary],
  );
});

test('wraps Tab at both modal boundaries without moving interior focus', () => {
  const first = {};
  const middle = {};
  const last = {};
  const elements = [first, middle, last];
  assert.equal(getModalTabWrapTarget(elements, last, false), first);
  assert.equal(getModalTabWrapTarget(elements, first, true), last);
  assert.equal(getModalTabWrapTarget(elements, middle, false), null);
  assert.equal(getModalTabWrapTarget(elements, {}, false), first);
  assert.equal(getModalTabWrapTarget(elements, {}, true), last);
  assert.equal(getModalTabWrapTarget(elements, null, false), first);
  assert.equal(getModalTabWrapTarget([], null, false), null);
});

test('only Escape dismisses a modal', () => {
  assert.equal(isModalDismissKey('Escape'), true);
  assert.equal(isModalDismissKey('Enter'), false);
  assert.equal(isModalDismissKey('Tab'), false);
});
