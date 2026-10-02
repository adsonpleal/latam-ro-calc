import { Store } from '../state/store';
import { PickerRequest, PickerResult } from '../../app/layout/pages/ro-calculator/item-picker/item-picker.model';
import { SlotColorPickerEvent, SlotColorPickerRequest } from '../../app/layout/pages/ro-calculator/slot-color-picker/slot-color-picker.model';

/** Only one request can own a picker; replacement settles the previous promise. */
export class PickerRequests<Request, Result> extends Store<Request | null> {
  private finish?: (result: Result) => void;
  constructor(private readonly dismissed: Result) { super(null); }
  open(request: Request): Promise<Result> {
    this.close();
    return new Promise(resolve => { this.finish = resolve; this.set(request); });
  }
  settle(result: Result): void {
    const finish = this.finish; this.finish = undefined; this.set(null); finish?.(result);
  }
  close(): void { this.settle(this.dismissed); }
}
export class ItemPicker extends PickerRequests<PickerRequest, PickerResult> {
  constructor() { super({ committed: false }); }
}
export class ColorPicker extends PickerRequests<SlotColorPickerRequest, SlotColorPickerEvent> {
  constructor() { super({ kind: 'dismiss' }); }
}
