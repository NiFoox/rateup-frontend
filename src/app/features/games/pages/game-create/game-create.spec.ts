import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameCreate } from './game-create';

describe('GameCreate', () => {
  let component: GameCreate;
  let fixture: ComponentFixture<GameCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
