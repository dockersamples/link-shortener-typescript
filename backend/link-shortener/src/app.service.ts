import { Inject, Injectable } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { AppRepository, AppRepositoryTag } from './app.repository';

@Injectable()
export class AppService {
  constructor(
    @Inject(AppRepositoryTag) private readonly appRepository: AppRepository,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  shorten(url: string): Observable<string> {
    const hash = Math.random().toString(36).slice(7);
    return this.appRepository.put(hash, url).pipe(map(() => hash));
  }

  retrieve(hash: string): Observable<string> {
    return this.appRepository.get(hash);
  }
}
