# Link Shortener

## Build From Scratch

### Create Nest.js Project
To install Nest.js CLI globally using NPM:

```bash
npm install -g @nestjs/cli
```

Create a directory named `backend` and get into it:

```bash
mkdir -p backend
cd backend
```

Now, create a Nest.js project there:

```bash
nest new link-shortener
```

Then, when asked to pick a package manager, pick `npm` just by pressing enter.

A git repo is created under `link-shortener` with everything included in it.
As we are already inside a git repo, let's remove the `.git` directory in the Nest.js
project and commit the whole project instead.

```bash
cd link-shortener
rm -rf .git
git add .
git commit -m "Create Nest.js project"
```

### Add Shortening Logic

Let's take a look into the `src` directory:

```
src
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```

- `app.controller.ts` is the HTTP controller.
- `app.controller.spec.ts` is where the tests for the controller reside.
- `app.module.ts` is the module definitions (for dependency injection, etc).
- `app.service.ts` is where the service resides.

Some context: The business logic should reside in the service layer,
and the controller in charge of serving the logic to I/O device, namely HTTP.

As we want to create an endpoint that shortens URLs, let's create it in the controller, `app.controller.ts`:

```typescript
import { Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Observable, of } from "rxjs";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('shorten')
  shorten(@Query('url') url: string): Observable<string> {
    // TODO implement
    return of(undefined);
  }
}
```

Some explanation:
- The function is mapped to the POST requests to the URL `/shorten`,
- The variable `url` is a parameter that we expect is going to be sent with the request,
- The parameter `url` is expected to have the type of `string`,
- The function is async and returns an observable.

To learn more about observables, take a look [RxJS.dev](https://rxjs.dev/).

Now that we have an empty function, let's write a test for it, in `app.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { tap } from "rxjs";

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  // here
  describe('shorten', () => {
    it('should return a valid string', done => {
      const url = 'aerabi.com';
      appController
        .shorten(url)
        .pipe(tap(hash => expect(hash).toBeTruthy()))
        .subscribe({ complete: done });
    })
  });
});
```

Run the tests to make sure it fails:

```bash
npm test
```

Now, let's create a function in the service layer, `app.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Observable, of } from "rxjs";

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  shorten(url: string): Observable<string> {
    const hash = Math.random().toString(36).slice(7);
    return of(hash);
  }
}
```

And let's call it in the controller, `app.controller.ts`:

```typescript
import { Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Observable } from "rxjs";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('shorten')
  shorten(@Query('url') url: string): Observable<string> {
    return this.appService.shorten(url);
  }
}
```

Let's run the tests once more:

```bash
npm test
```

A few points to clear here:
- The function `shorten` in the service layer is sync, why did we wrap into an observable? 
  It's because of being future-proof. In the next stages we're going to save the hash into a DB and that's not sync anymore.
- Why does the function `shorten` get an argument but never uses it? Again, for the DB.

### Add a Repository

A repository is a layer that is in charge of storing stuff.
Here, we would want a repository layer to store the mapping between the hashes and their original URLs.

Let's first create an interface for the repository. Create a file named `app.repository.ts` and fill it up as follows:

```typescript
import { Observable } from 'rxjs';

export interface AppRepository {
  put(hash: string, url: string): Observable<string>;
  get(hash: string): Observable<string>;
}

export const AppRepositoryTag = 'AppRepository';
```

Now, let's create a simple repository that stores the mappings in a hashmap in the memory.
Create a file named `app.repository.hashmap.ts`:

```typescript
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
```

Now, let's instruct Nest.js that if one asked for `AppRepositoryTag` provide them with `AppRepositoryHashMap`.
First, let's do it in the `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppRepositoryTag } from './app.repository';
import { AppRepositoryHashmap } from './app.repository.hashmap';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: AppRepositoryTag, useClass: AppRepositoryHashmap }, // <-- here
  ],
})
export class AppModule {}
```

Let's do the same in the test, `app.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { tap } from 'rxjs';
import { AppRepositoryTag } from './app.repository';
import { AppRepositoryHashmap } from './app.repository.hashmap';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: AppRepositoryTag, useClass: AppRepositoryHashmap }, // <-- here
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  . . .
});
```

Now, let's go the service layer, `app.service.ts`, and create a `retrieve` function:

```typescript
. . .

@Injectable()
export class AppService {
  . . .

  retrieve(hash: string): Observable<string> {
    return of(undefined);
  }
}
```

And then create a test in `app.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { AppService } from "./app.service";
import { AppRepositoryTag } from "./app.repository";
import { AppRepositoryHashmap } from "./app.repository.hashmap";
import { mergeMap, tap } from "rxjs";

describe('AppService', () => {
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AppRepositoryTag, useClass: AppRepositoryHashmap },
        AppService,
      ],
    }).compile();

    appService = app.get<AppService>(AppService);
  });

  describe('retrieve', () => {
    it('should retrieve the saved URL', done => {
      const url = 'aerabi.com';
      appService.shorten(url)
        .pipe(mergeMap(hash => appService.retrieve(hash)))
        .pipe(tap(retrieved => expect(retrieved).toEqual(url)))
        .subscribe({ complete: done })
    });
  });
});
```

Run the tests so that they fail:

```bash
npm test
```

And then implement the function to make them pass, in `app.service.ts`:

```typescript
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
    return this.appRepository.put(hash, url).pipe(map(() => hash)); // <-- here
  }

  retrieve(hash: string): Observable<string> {
    return this.appRepository.get(hash); // <-- and here
  }
}
```

Run the tests again, and they pass. :muscle:

### Add a Real Database

So far, we created the repositories that store the mappings in memory.
That's okay for testing, but not suitable for production, as we'll lose the mappings when the server stops.

Redis is an appropriate database for the job because it is/has a persistent key-value store.

To add Redis to the stack, let's create a Docker-Compose file with Redis on it.
Create a file named `docker-compose.yaml` in the root of the project:

```yaml
services:
  redis:
    image: 'redis/redis-stack'
    ports:
      - '6379:6379'
      - '8001:8001'
  dev:
    image: 'node:16'
    command: bash -c "cd /app && npm run start:dev"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - './backend/link-shortener:/app'
    ports:
      - '3000:3000'
    depends_on:
      - redis
```

Install Redis package (run this command inside `backend/link-shortener`):

```bash
npm install redis@4.1.0 --save
```

Inside `src`, create a repository that uses Redis, `app.repository.redis.ts`:

```typescript
import { AppRepository } from './app.repository';
import { Observable, from, mergeMap } from 'rxjs';
import { createClient, RedisClientType } from 'redis';

export class AppRepositoryRedis implements AppRepository {
  private readonly redisClient: RedisClientType;

  constructor() {
    const host = process.env.REDIS_HOST || 'redis';
    const port = +process.env.REDIS_PORT || 6379;
    this.redisClient = createClient({
      url: `redis://${host}:${port}`,
    });
    from(this.redisClient.connect()).subscribe({ error: console.error });
    this.redisClient.on('connect', () => console.log('Redis connected'));
    this.redisClient.on('error', console.error);
  }

  get(hash: string): Observable<string> {
    return from(this.redisClient.get(hash));
  }

  put(hash: string, url: string): Observable<string> {
    return from(this.redisClient.set(hash, url)).pipe(
            mergeMap(() => from(this.redisClient.get(hash))),
    );
  }
}
```

And finally change the provider in `app.module.ts` so that the service uses Redis repository instead of the hashmap one:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppRepositoryTag } from './app.repository';
import { AppRepositoryRedis } from "./app.repository.redis";

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: AppRepositoryTag, useClass: AppRepositoryRedis }, // <-- here
  ],
})
export class AppModule {}
```

### Finalize the Backend

Now, head back to `app.controller.ts` and create another endpoint for redirect:

```typescript
import { Body, Controller, Get, Param, Post, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { map, Observable, of } from 'rxjs';

interface ShortenResponse {
  hash: string;
}

interface ErrorResponse {
  error: string;
  code: number;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('shorten')
  shorten(@Body('url') url: string): Observable<ShortenResponse | ErrorResponse> {
    if (!url) {
      return of({ error: `No url provided. Please provide in the body. E.g. {'url':'https://google.com'}`, code: 400 });
    }
    return this.appService.shorten(url).pipe(map(hash => ({ hash })));
  }

  @Get(':hash')
  @Redirect()
  retrieveAndRedirect(@Param('hash') hash): Observable<{ url: string }> {
    return this.appService.retrieve(hash).pipe(map(url => ({ url })));
  }
}
```

Run the whole application using Docker Compose:

```bash
docker-cmpose up -d
```

Then visit the application at [`localhost:3000`](http://localhost:3000) and you should see a "Hello World!" message.
To shorten a new link, use the following cURL command:

```bash
curl -XPOST -d "url1=https://aerabi.com" localhost:3000/shorten
```

Take a look at the response:

```json
{"hash":"350fzr"}
```

The hash differs on your machine. You can use it to redirect to the original link.
Open a web browser and visit [`localhost:3000/350fzr`](http://localhost:3000/350fzr).
