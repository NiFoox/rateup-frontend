import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Review {
  id?: number;
  gameTitle: string;
  content: string;
  score: number;
  author: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000';

  create(review: Omit<Review, 'id'>) {
    return this.http.post(`${this.baseUrl}/reviews`, review); // POST /reviews
  }

  update(id: number, review: Partial<Omit<Review, 'id'>>) {
    return this.http.put(`${this.baseUrl}/reviews/${id}`, review); // PUT /reviews/{id}
  }
}
