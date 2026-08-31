import { beforeEach, describe, expect, it, vi } from 'vitest';

const uploadToSignedUrlMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: {
    auth: { getSession: () => getSessionMock() },
    storage: { from: () => ({ uploadToSignedUrl: uploadToSignedUrlMock }) },
  },
}));

import { uploadLessonDocument } from '@/services/api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const FILE = new File(['vocab'], 'vocab.pdf', { type: 'application/pdf' });

function mintOk(path = 'org1/abc.pdf') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ path, token: 'upload-token', maxBytes: 10 * 1024 * 1024 }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionMock.mockResolvedValue({ data: { session: { access_token: 'jwt' } } });
  uploadToSignedUrlMock.mockResolvedValue({ data: { path: 'org1/abc.pdf' }, error: null });
});

describe('uploadLessonDocument', () => {
  it('mints a signed URL and puts the file straight into storage', async () => {
    mintOk();

    const path = await uploadLessonDocument(FILE);

    expect(path).toBe('org1/abc.pdf');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/group/lesson-documents');
    expect(init.headers.Authorization).toBe('Bearer jwt');
    // Only the mime type crosses the function — never the file itself.
    expect(JSON.parse(init.body)).toEqual({ mimeType: 'application/pdf' });
    expect(uploadToSignedUrlMock).toHaveBeenCalledWith('org1/abc.pdf', 'upload-token', FILE, {
      contentType: 'application/pdf',
    });
  });

  it("surfaces the mint route's error and uploads nothing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Only PDF and plain text files can be attached.' }),
    });

    await expect(uploadLessonDocument(FILE)).rejects.toThrow('Only PDF and plain text files');
    expect(uploadToSignedUrlMock).not.toHaveBeenCalled();
  });

  it('throws when storage rejects the upload', async () => {
    mintOk();
    uploadToSignedUrlMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Payload too large' },
    });

    await expect(uploadLessonDocument(FILE)).rejects.toThrow('Payload too large');
  });
});
