import { Injectable } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { HydraApiService, type PaginationOptions } from '@core/services/hydra-api';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import type { UpdateUserInput, UserInput, UserOutput } from '@features/account/models';

@Injectable({ providedIn: 'root' })
export class UserService extends HydraApiService {
  private static readonly BASE_PATH: string = '/api/users';

  public list(options?: PaginationOptions): Observable<HydraCollection<UserOutput>> {
    return this.getCollection<UserOutput>(UserService.BASE_PATH, options);
  }

  public get(id: string): Observable<UserOutput> {
    return this.getOne<UserOutput>(`${UserService.BASE_PATH}/${id}`);
  }

  public create(input: UserInput): Observable<UserOutput> {
    return this.post<UserInput, UserOutput>(UserService.BASE_PATH, input);
  }

  public replace(id: string, input: UserInput): Observable<UserOutput> {
    return this.put<UserInput, UserOutput>(`${UserService.BASE_PATH}/${id}`, input);
  }

  public update(id: string, input: UpdateUserInput): Observable<UserOutput> {
    return this.patch<UpdateUserInput, UserOutput>(`${UserService.BASE_PATH}/${id}`, input);
  }

  public remove(id: string): Observable<void> {
    return this.delete(`${UserService.BASE_PATH}/${id}`);
  }

  public activate(id: string): Observable<UserOutput> {
    return this.postAction<UserOutput>(`${UserService.BASE_PATH}/${id}/activate`);
  }

  public deactivate(id: string): Observable<UserOutput> {
    return this.postAction<UserOutput>(`${UserService.BASE_PATH}/${id}/deactivate`);
  }

  public verifyEmail(id: string): Observable<UserOutput> {
    return this.postAction<UserOutput>(`${UserService.BASE_PATH}/${id}/verify-email`);
  }

  public listStatuses(options?: PaginationOptions): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>(`${UserService.BASE_PATH}/statuses`, options);
  }

  public uploadAvatar(
    id: string,
    avatar: Blob,
    fileName: string = 'avatar',
  ): Observable<UserOutput> {
    const body = new FormData();
    body.set('avatar', avatar, fileName);

    return this.http
      .post<UserOutput>(this.buildUrl(`${UserService.BASE_PATH}/${id}/avatar`), body, {
        headers: this.defaultHeaders.delete('Content-Type'),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }
}
