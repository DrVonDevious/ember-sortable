import { A } from '@ember/array';
import Component from '@ember/component';
import { set, get } from '@ember/object';
import { run } from '@ember/runloop';
import layout from '../templates/components/sortable-group';
import { computed } from '@ember/object';

const a = A;
const NO_MODEL = {};

export default Component.extend({
  layout: layout,

  /**
   @property direction
   @type string
   @default y
   */
  direction: 'y',

  /**
   @property model
   @type Any
   @default null
   */
  model: NO_MODEL,

  /**
   @property items
   @type Ember.NativeArray
   */
  items: computed(() => a()),

  /**
   Position for the first item.
   If spacing is present, first item's position will have to change as well.
   @property itemPosition
   @type Number
   */
  itemPosition: computed(function () {
    let direction = this.get('direction');

    return this.get(`sortedItems.firstObject.${direction}`) - this.get('sortedItems.firstObject.spacing');
  }).volatile(),
  itemPositionX: computed('sortedItems', function () {
    return 0 - this.get('sortedItems.firstObject.spacing');
  }).volatile(),
  itemPositionY: computed('sortedItems', function () {
    return 0 - this.get('sortedItems.firstObject.spacing');
  }).volatile(),

  /**
   @property sortedItems
   @type Array
   */
  sortedItems: computed('items', function () {
    const items = a(this.get('items'));
    const direction = this.get('direction');

    if (direction.length === 2) {
      const [first, second] = direction.split('');
      return items.sort((a, b) => get(a, first) === get(b, first) ? get(a, second) - get(b, second) : get(a, first) - get(b, first));
    } else {
      return items.sortBy(direction);
    }
  }).volatile(),

  /**
   Register an item with this group.
   @method registerItem
   @param {SortableItem} [item]
   */
  registerItem(item) {
    this.get('items').addObject(item);
  },

  /**
   De-register an item with this group.
   @method deregisterItem
   @param {SortableItem} [item]
   */
  deregisterItem(item) {
    this.get('items').removeObject(item);
  },

  /**
   Prepare for sorting.
   Main purpose is to stash the current itemPosition so
   we don’t incur expensive re-layouts.
   @method prepare
   */
  prepare() {
    this._itemPosition = this.get('itemPosition');
    this._itemPositionX = this.get('itemPositionX');
    this._itemPositionY = this.get('itemPositionY');
  },

  /**
   Update item positions (relatively to the first element position).
   @method update
   */
  update() {
    let sortedItems = this.get('sortedItems');
    // Position of the first element
    let position = this._itemPosition;
    let positionX = this._itemPositionX;
    let positionY = this._itemPositionY;

    // Just in case we haven’t called prepare first.
    if (position === undefined) {
      position = this.get('itemPosition');
    }
    if (positionX === undefined) {
      positionX = this.get('itemPositionX');
    }
    if (positionY === undefined) {
      positionY = this.get('itemPositionY');
    }

    let startX = positionX;
    //let startY = positionY;

    //const draggingItem = sortedItems.findBy('isDragging', true);
    const maxWidth = Math.max(...get(this, 'sortedItems').mapBy('width'));
    const numColumns = A(get(this, 'sortedItems').rejectBy('isDragging')).uniqBy('x').length;
    sortedItems.forEach((item, index) => {
      let direction = this.get('direction');
      if (get(this, 'direction').length > 1) {
        if (!get(item, 'isDragging')) {
          if (this._hasX(direction)) {
            set(item, 'x', positionX);
          }
          if (this._hasY(direction)) {
            set(item, 'y', positionY);
          }
        }

        // add additional spacing around active element
        if (get(item, 'isBusy')) {
          positionX += get(item, 'spacing') * 2;
          positionY += get(item, 'spacing') * 2;
        }

        if (this._hasX(direction)) {
          if(numColumns === 1) {
            positionX = startX;
          } else if (index > 0 && 0 === (index+1) % 2) {
            positionX = startX;
          } else {
            positionX = maxWidth;
          }
        }

        if (this._hasY(direction) && index > 0 && 0 === (index+1) % 2) {
          positionY += get(item, 'height');
        } else if(numColumns === 1) {
          positionY += get(item, 'height')
        }
      } else {
        let dimension;
        if (!get(item, 'isDragging')) {
          set(item, direction, position);
        }

        // add additional spacing around active element
        if (get(item, 'isBusy')) {
          position += get(item, 'spacing') * 2;
        }

        if (direction === 'x') {
          dimension = 'width';
        }
        if (direction === 'y') {
          dimension = 'height';
        }

        position += get(item, dimension);
      }
    });
  },

  /**
   @method commit
   */
  commit() {
    let items = this.get('sortedItems');
    let groupModel = this.get('model');
    let itemModels = items.mapBy('model');
    let draggedItem = items.findBy('wasDropped', true);
    let draggedModel;

    if (draggedItem) {
      set(draggedItem, 'wasDropped', false); // Reset
      draggedModel = get(draggedItem, 'model');
    }

    delete this._itemPosition;
    delete this._itemPositionX;
    delete this._itemPositionY;

    run.schedule('render', () => {
      items.invoke('freeze');
    });

    run.schedule('afterRender', () => {
      items.invoke('reset');
    });

    run.next(() => {
      run.schedule('render', () => {
        items.invoke('thaw');
      });
    });

    if (groupModel !== NO_MODEL) {
      this.sendAction('onChange', groupModel, itemModels, draggedModel); // eslint-disable-line ember/closure-actions
    } else {
      this.sendAction('onChange', itemModels, draggedModel); // eslint-disable-line ember/closure-actions
    }
  },

  _hasX(direction) {
    return /[x]+/.test(direction);
  },

  _hasY(direction) {
    return /[y]+/.test(direction);
  }
});
