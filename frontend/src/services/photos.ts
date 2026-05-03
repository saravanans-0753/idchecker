import { File, Directory, Paths } from 'expo-file-system/next';
import { type Resident } from './storage';

const PHOTOS_DIR_NAME = 'resident_photos';

async function getPhotosDir(): Promise<Directory> {
  const dir = new Directory(Paths.document, PHOTOS_DIR_NAME);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

function getFileExtension(url: string): string {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp)/i);
  return match ? match[0] : '.jpg';
}

/**
 * Download a photo from URL and save to local file system.
 * Returns the local file URI or empty string if failed.
 */
export async function downloadPhoto(residentId: string, photoUrl: string): Promise<string> {
  if (!photoUrl) return '';

  try {
    const dir = await getPhotosDir();
    const ext = getFileExtension(photoUrl);
    const fileName = `${residentId}${ext}`;
    const filePath = new File(dir, fileName);

    // Skip if already downloaded
    if (filePath.exists) {
      return filePath.uri;
    }

    // Download
    const output = await File.downloadFileAsync(photoUrl, dir, { name: fileName });
    return output.uri;
  } catch (error) {
    console.warn(`Photo download failed for ${residentId}:`, error);
    return '';
  }
}

/**
 * Download all photos for residents that have a photo_url but no local_photo.
 * Returns updated residents with local_photo paths.
 */
export async function downloadAllPhotos(
  residents: Resident[],
  onProgress?: (done: number, total: number) => void
): Promise<Resident[]> {
  const total = residents.filter(r => r.photo_url && !r.local_photo).length;
  let done = 0;

  const updated = [...residents];
  for (let i = 0; i < updated.length; i++) {
    const r = updated[i];
    if (r.photo_url && !r.local_photo) {
      const localUri = await downloadPhoto(r.id, r.photo_url);
      if (localUri) {
        updated[i] = { ...r, local_photo: localUri };
      }
      done++;
      if (onProgress) onProgress(done, total);
    }
  }
  return updated;
}

/**
 * Delete a resident's photo from local file system.
 */
export async function deleteLocalPhoto(residentId: string): Promise<void> {
  try {
    const dir = await getPhotosDir();
    // Try common extensions
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      const file = new File(dir, `${residentId}${ext}`);
      if (file.exists) {
        file.delete();
        break;
      }
    }
  } catch (_) {}
}
