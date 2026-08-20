import { Routes } from '@angular/router';

export const HOTELS_ROUTES: Routes = [
  { path: 'search', loadComponent: () => import('./search-results/search-results.component').then(m => m.SearchResultsComponent) },
  { path: ':id', loadComponent: () => import('./hotel-details/hotel-details.component').then(m => m.HotelDetailsComponent) },
];
