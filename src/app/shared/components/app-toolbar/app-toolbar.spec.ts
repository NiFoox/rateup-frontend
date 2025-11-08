import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { AppToolbar } from './app-toolbar';
import { AuthService } from '../../../core/auth/auth.service';
import { TokenStorageService } from '../../../core/auth/token-storage.service';

class AuthServiceStub {
  me(): Observable<null> {
    return of(null);
  }
}

class TokenStorageServiceStub {
  getUser(): null {
    return null;
  }
}

describe('AppToolbar', () => {
  let component: AppToolbar;
  let fixture: ComponentFixture<AppToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppToolbar],
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: TokenStorageService, useClass: TokenStorageServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppToolbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
