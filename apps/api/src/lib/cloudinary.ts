import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Uploads a local file to Cloudinary and returns the public secure URL.
 * 
 * @param localFilePath The absolute path to the file on the local disk
 * @returns The secure public URL provided by Cloudinary
 */
export async function uploadToCloudinary(localFilePath: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto', // Automatically detect whether it's an image or video
    })
    return result.secure_url
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload media to Cloudinary in the backend')
  }
}
