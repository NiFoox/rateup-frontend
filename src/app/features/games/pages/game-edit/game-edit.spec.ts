import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameEdit } from './game-edit';

describe('GameEdit', () => {
  let component: GameEdit;
  let fixture: ComponentFixture<GameEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
