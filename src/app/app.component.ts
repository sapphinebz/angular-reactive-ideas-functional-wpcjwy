import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  Input,
  NgModule
} from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { RxState, selectSlice } from "@rx-angular/state";
import { interval, Observable, of } from "rxjs";
import { delay, switchMap, tap } from "rxjs/operators";

let _currentCmp: Reactive;

class Reactive {
  state = new RxState<any>();

  constructor({ boundProperties = [] } = {}) {
    _currentCmp = this;
    _bindProperties(boundProperties);
  }
}

function derived(projector) {
  const slice = _extractArgs(projector);
  return _currentCmp.state.select(selectSlice(slice)).pipe(
    switchMap((...args) => {
      const result = projector(...args);
      if (!(result.subscribe || result.then)) {
        return of(result);
      }
      return result;
    })
  );
}

function select(selector) {
  return _currentCmp.state.select(selector);
}

function _bindProperties(properties) {
  for (const property of properties) {
    Object.defineProperty(_currentCmp, property, {
      get: () => _currentCmp.state.get(property),
      set: (value: any) => _currentCmp.state.set({ [property]: value } as any)
    });
  }
}

/* Extract destructured args list from function.
 * _extractArgs(({name, user}) => ...) produces ['name', 'user'] */
function _extractArgs(fn) {
  return fn
    .toString()
    .match(/{(.*?)}/)[1]
    .split(",")
    .map(str => str.trim());
}

const Watch = () => (target, property) => {
  Object.defineProperty(target, property, {
    get: function() {
      return this.state.get(property);
    },
    set: function(value) {
      return this.state.set({ [property]: value } as any);
    }
  });
};

class Stateful {
  state = new RxState();
  constructor() {
    _currentCmp = this;
  }
}

@Injectable({
  providedIn: "root"
})
export class UserRepository {
  getUser(userId: string) {
    return of({
      id: userId,
      name: "Foo"
    }).pipe(delay(1000));
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "mc-user",
  template: `
    <button (click)="increment()">INCREMENT</button>
    <button (click)="decrement()">DECREMENT</button>
    <div>{{ user$ | async | json }}</div>
    <div>{{ value$ | async }}</div>
    <div>{{ double$ | async }}</div>
  `
})
export class UserComponent extends Stateful {
  @Watch() @Input() value: number;

  value$ = select("value");
  double$ = derived(({ value }) => value * 2);
  user$ = derived(({ value }) => this._userRepository.getUser(value));

  constructor(private _userRepository: UserRepository) {
    super();
  }

  increment() {
    this.value++;
  }

  decrement() {
    this.value--;
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "my-app",
  template: `
    <mc-user [value]="10"></mc-user>
  `
})
export class AppComponent {}

@NgModule({
  imports: [BrowserModule],
  declarations: [AppComponent, UserComponent],
  bootstrap: [AppComponent]
})
export class AppModule {}
