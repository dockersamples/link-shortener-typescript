import { AppRepository } from './app.repository';
import { Observable, of } from 'rxjs';

export class AppRepositoryHashmap implements AppRepository {
  private readonly hashMap: Map<string, string>;

  constructor() {
    this.hashMap = new Map<string, string>();
  }

  get(hash: string): Observable<string> {
    return of(this.hashMap.get(hash));
  }

  put(hash: string, url: string): Observable<string> {
    return of(this.hashMap.set(hash, url).get(hash));
  }
}
