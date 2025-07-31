//app/components/affirmations/types.ts
export interface AffirmationData {
  id: string;
  message: string;
  day: string;
  category?: 'motivation' | 'gratitude' | 'strength' | 'joy';
}

export interface AffirmationState {
  currentAffirmation: string;
  isAffirmationFavorited: boolean;
  showAffirmationActions: boolean;
  affirmationReadCount: number;
  favoriteAffirmations: string[];
}

export interface User {
  mongoId?: string;
  firebaseUid?: string;
  uid?: string;
  id?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

