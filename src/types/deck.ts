export interface Deck {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  cardCount: number;
  ownerId: string;
  isShared?: boolean;
  emoji: string;
  pinned?: boolean;
  isPublic?: boolean;
  position: number;
}
