import { fileToBase64 } from '../file-to-base64.utils';

describe('fileToBase64', () => {
  it('resolves with the base64 content, stripped of the data URL prefix', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    await expect(fileToBase64(file)).resolves.toBe(btoa('hello'));
  });

  it('resolves with an empty string for an empty file', async () => {
    const file = new File([], 'empty.txt', { type: 'text/plain' });

    await expect(fileToBase64(file)).resolves.toBe('');
  });
});
