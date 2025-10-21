const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const generateImageVariants = async (image) => {
  try {
    const uploadPromises = [
      cloudinary.uploader.upload(image, {
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        folder: 'home-base-listings/thumbnails',
        transformation: [
          { width: 400, height: 300, crop: 'fill', gravity: 'auto', quality: 'auto:good' },
          { format: 'webp' }
        ]
      }),
      cloudinary.uploader.upload(image, {
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        folder: 'home-base-listings/medium',
        transformation: [
          { width: 800, height: 600, crop: 'fill', gravity: 'auto', quality: 'auto:best' },
          { format: 'webp' }
        ]
      }),
      cloudinary.uploader.upload(image, {
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        folder: 'home-base-listings/large',
        transformation: [
          { width: 1200, height: 800, crop: 'fill', gravity: 'auto', quality: 'auto:best' },
          { format: 'webp' }
        ]
      })
    ];

    const results = await Promise.all(uploadPromises);
    return {
      thumbnail: results[0].secure_url,
      medium: results[1].secure_url,
      large: results[2].secure_url,
      original: results[2].secure_url 
    };
  } catch (error) {
    console.error('Error generating image variants:', error);
    throw error;
  }
};

module.exports = { cloudinary, generateImageVariants };