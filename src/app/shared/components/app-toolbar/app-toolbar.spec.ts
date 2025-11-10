import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppToolbar } from './app-toolbar';

describe('AppToolbar', () => {
  let component: AppToolbar;
  let fixture: ComponentFixture<AppToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppToolbar],
      providers: [provideRouter([]), provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(AppToolbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show reviews navigation link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Reseñas');
  });
});
