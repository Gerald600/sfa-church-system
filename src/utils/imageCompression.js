import imageCompression from 'browser-image-compression'

/**
 * Client-side image compression utility.
 * Compresses an image file before upload to Supabase Storage.
 * 
 * @param {File} imageFile - The original File object.
 * @param {Object} options - Custom compression options.
 * @returns {Promise<File>} - Compressed File object.
 */
export const compressImage = async (imageFile, options = {}) => {
  if (!imageFile) return null

  // Default compression targets: max 1MB (or 0.5MB), max width/height 1920px
  const defaultOptions = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: imageFile.type || 'image/jpeg',
    ...options
  }

  // If already small (< 300KB), return original
  if (imageFile.size <= 300 * 1024) {
    return imageFile
  }

  try {
    const compressedFile = await imageCompression(imageFile, defaultOptions)
    console.log(
      `Image compressed: original ${(imageFile.size / 1024).toFixed(1)}KB -> compressed ${(compressedFile.size / 1024).toFixed(1)}KB`
    )
    return compressedFile
  } catch (error) {
    console.warn('browser-image-compression failed, falling back to canvas compression:', error)
    return await fallbackCanvasCompression(imageFile, defaultOptions)
  }
}

/**
 * Fallback Canvas compression if web worker or browser-image-compression fails
 */
const fallbackCanvasCompression = (file, options) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxDim = options.maxWidthOrHeight || 1920

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const newFile = new File([blob], file.name, {
              type: file.type || 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(newFile)
          },
          file.type || 'image/jpeg',
          0.8
        )
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = () => resolve(file)
  })
}
