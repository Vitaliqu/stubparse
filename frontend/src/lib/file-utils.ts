export const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/bmp",
  "image/tiff",
]);

export const isImageFile = (file: File) => IMAGE_TYPES.has(file.type);

export const isAcceptedFile = (file: File) =>
  file.type === "application/pdf" || IMAGE_TYPES.has(file.type);
