import {v2 as cloudinary} from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
})

export const uploadToCloudinary = async (buffer,folder,options = {}) => {
    return new Promise((resolve,reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `suvidha/${folder}`,
                resource_type: 'auto',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
                tags: ['suvidha',folder],
                ...options
            },
            (error,result) => {
                if(error) reject(error)
                else resolve(result)
            }
        )
        stream.end(buffer)
    })
}

export default cloudinary;