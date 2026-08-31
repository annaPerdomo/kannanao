export const LESSON_DOCUMENTS_BUCKET = 'lesson-documents';

export const LESSON_DOCUMENT_MIME_TYPES = ['application/pdf', 'text/plain'] as const;

export type LessonDocumentMimeType = (typeof LESSON_DOCUMENT_MIME_TYPES)[number];

export function isLessonDocumentMimeType(value: unknown): value is LessonDocumentMimeType {
  return (
    typeof value === 'string' && (LESSON_DOCUMENT_MIME_TYPES as readonly string[]).includes(value)
  );
}

export function lessonDocumentExtension(mimeType: LessonDocumentMimeType): 'pdf' | 'txt' {
  return mimeType === 'application/pdf' ? 'pdf' : 'txt';
}

const LESSON_DOCUMENT_PATH = /^[\w-]+\/[\w-]+\.(pdf|txt)$/;

/**
 * The prefix is what stops one organizer from naming another's upload. The shape
 * is checked too — `..` and `%2e` in a key both reach Storage unescaped.
 */
export function ownsLessonDocumentPath(path: unknown, uploaderId: string): path is string {
  return (
    typeof path === 'string' && LESSON_DOCUMENT_PATH.test(path) && path.startsWith(`${uploaderId}/`)
  );
}
