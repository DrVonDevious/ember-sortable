import { registerAsyncHelper } from '@ember/test';

/*
  In tests, the dummy app is rendered at half size.
  To avoid rounding errors, we must therefore double
  the overshoot.
*/
const OVERSHOOT = 2;

/**
 * Reorders elements to the specified state.
 *
 * Example:

```js
reorder(
  'mouse',
  '.some-list li',
  '[data-id="66278893"]',
  '[data-id="66278894"]',
  '[data-id="66278892"]'
);
```
 * @method reorder
 * @public
 * @param {Ember.Application} app
 * @param {'mouse'|'touch'} mode event mode
 * @param {String} itemSelector selector for all items
 * @param {String} [...resultSelectors] selectors for the resultant order
 * @return {Promise}
 */
export function reorder(app, mode, itemSelector, ...resultSelectors) {
  const {
    andThen,
    drag,
    findWithAssert,
    wait
  } = app.testHelpers;

  resultSelectors.forEach((selector, targetIndex) => {
    andThen(() => {
      let items = findWithAssert(itemSelector);
      let element = items.filter(selector);
      let targetElement = items.eq(targetIndex);
      let dx = targetElement.offset().left - OVERSHOOT - element.offset().left;
      let dy = targetElement.offset().top - OVERSHOOT - element.offset().top;

      drag(mode, element, () => { return { dx: dx, dy: dy }; });
    });
  });

  return wait();
}

export default registerAsyncHelper('reorder', reorder);
