import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_KEY_SECRET 
    });
    const uploadOnCloudinary=async(localPath)=>{
        try {
            if(!localPath) return null;
                const response =await cloudinary.uploader.upload(localPath,{
                    resource_type:"auto"
                });
                // console.log("cloudinary response url",response.url);
                return response;           
        } catch (error) {
            fs.unlinkSync(localPath);
        }
    }  
export {uploadOnCloudinary}