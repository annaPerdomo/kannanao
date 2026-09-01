import { describe, expect, it } from 'vitest';

import {
  isLessonDocumentMimeType,
  lessonDocumentExtension,
  ownsLessonDocumentPath,
} from '../lessonDocuments';

const ORG = '0f3c1a2b-1111-4222-8333-444455556666';
const OTHER = '9a9a9a9a-1111-4222-8333-444455556666';
const OWN = `${ORG}/2f1c1e0e-0000-4000-8000-000000000000.pdf`;

describe('isLessonDocumentMimeType', () => {
  it('accepts only PDF and plain text', () => {
    expect(isLessonDocumentMimeType('application/pdf')).toBe(true);
    expect(isLessonDocumentMimeType('text/plain')).toBe(true);
    expect(isLessonDocumentMimeType('image/png')).toBe(false);
    expect(isLessonDocumentMimeType(undefined)).toBe(false);
    expect(isLessonDocumentMimeType(null)).toBe(false);
  });
});

describe('lessonDocumentExtension', () => {
  it('names the file after its type', () => {
    expect(lessonDocumentExtension('application/pdf')).toBe('pdf');
    expect(lessonDocumentExtension('text/plain')).toBe('txt');
  });
});

describe('ownsLessonDocumentPath', () => {
  it('accepts the uploader’s own key', () => {
    expect(ownsLessonDocumentPath(OWN, ORG)).toBe(true);
    expect(ownsLessonDocumentPath(`${ORG}/abc.txt`, ORG)).toBe(true);
  });

  it('refuses another uploader’s key', () => {
    expect(ownsLessonDocumentPath(`${OTHER}/2f1c1e0e.pdf`, ORG)).toBe(false);
  });

  it('refuses traversal, encoded traversal and extra segments', () => {
    expect(ownsLessonDocumentPath(`${ORG}/../${OTHER}/x.pdf`, ORG)).toBe(false);
    expect(ownsLessonDocumentPath(`${ORG}/%2e%2e%2f${OTHER}%2fx.pdf`, ORG)).toBe(false);
    expect(ownsLessonDocumentPath(`${ORG}/nested/x.pdf`, ORG)).toBe(false);
  });

  it('refuses a prefix that merely starts with the uploader id', () => {
    expect(ownsLessonDocumentPath(`${ORG}-evil/x.pdf`, ORG)).toBe(false);
  });

  it('refuses other extensions and non-strings', () => {
    expect(ownsLessonDocumentPath(`${ORG}/x.exe`, ORG)).toBe(false);
    expect(ownsLessonDocumentPath(undefined, ORG)).toBe(false);
    expect(ownsLessonDocumentPath(42, ORG)).toBe(false);
  });
});
