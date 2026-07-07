// Shared camera helper so every capture screen opens the requested lens the
// same way — and reliably picks the *back* camera on phones.
//
// Why the fallback dance: `facingMode: 'environment'` is only a *soft* hint,
// so some mobile browsers keep using the front (selfie) camera when you ask
// for the back one. Asking with `{ exact: 'environment' }` forces the rear
// lens, but on laptops / single-camera devices that throws `OverconstrainedError`.
// So we try the strict constraint first and gracefully fall back to the soft
// one (and finally to bare video) so the camera always opens.

export type Lens = 'user' | 'environment';

export async function openCamera(mode: Lens): Promise<MediaStream> {
  const size = { width: { ideal: 1280 }, height: { ideal: 720 } };

  const attempts: MediaStreamConstraints[] = [
    { video: { ...size, facingMode: { exact: mode } } },
    { video: { ...size, facingMode: mode } },
    { video: size },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
