import imageCompression from 'browser-image-compression';

export const MAX_VOUCHER_IMAGES = 3;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export async function compressImages(files: File[]): Promise<File[]> {
  const compressedFiles: File[] = [];

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Chỉ hỗ trợ tải lên tập tin hình ảnh');
    }

    const options = {
      maxSizeMB: 3,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
    } as const;

    let output = file;
    try {
      output = await imageCompression(file, options);
    } catch (error) {
      console.warn('Image compression failed, using original file', error);
    }

    if (output.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Ảnh vượt quá dung lượng tối đa 10MB sau khi nén');
    }

    compressedFiles.push(output);
  }

  return compressedFiles;
}
