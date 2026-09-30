import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  readonly rootURL: string = (environment as any).apiURL || 'https://localhost:44309/api';

  constructor(private http: HttpClient) { }

  getItemList(): Observable<any> {
    return this.http.get(this.rootURL + '/Item');
  }
}