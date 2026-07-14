/** Shared between the client (pre-upload check), the upload-video route (mime
 * validation), and the messages route (post-upload size enforcement) so the
 * three can't drift out of sync. */
export const MAX_CHAT_VIDEO_SIZE = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_CHAT_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
