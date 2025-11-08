import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewCreate } from './review-create';

describe('ReviewCreate', () => {
  let component: ReviewCreate;
  let fixture: ComponentFixture<ReviewCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
