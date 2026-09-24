import { HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH_RETRY = new HttpContextToken<boolean>(() => false);
