export class Game {
  constructor(
    public name: string,
    public description: string,
    public genre: string,
    public id?: string,
  ) {}
}

export interface Game {
  id?: string;
  name: string;
  description: string;
  genre: string;
}
