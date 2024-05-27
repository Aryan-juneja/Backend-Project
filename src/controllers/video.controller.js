import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"



const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    let filter = {};
    let sort = {};

    if (query) {
        // Example: Search by title
        filter.title = { $regex: query, $options: 'i' }; // Case-insensitive regex search
    }

    // Apply userId filter if provided
    if (userId) {
        filter.userId = userId;
    }

    
    // Apply sorting
    if (sortBy && sortType) {
        sort[sortBy] = sortType === 'desc' ? -1 : 1;
    } else {
        // Default sorting (e.g., by creation date)
        sort.createdAt = -1; // Descending order
    }

     // Perform the query with pagination and sorting
     const videos = await Video.find(filter)
     .sort(sort)
     .skip((page - 1) * limit)
     .limit(parseInt(limit));

 const totalVideosCount = await Video.countDocuments(filter);

 res.status(200).json( new apiResponse(201,{
    total: totalVideosCount,
    page: parseInt(page),
    limit: parseInt(limit),
    videos: videos
},"all videos according to you"));
})


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const user=req.user?._id
    // console.log(title)
    // console.log(description)
    // Ensure the video file path is defined
    const videoFilepath = req.files?.videoFile[0].path;
    // console.log(videoFilepath)
    if (!videoFilepath) {
        throw new apiError(400, "video file path is undefined");
    }

    // Ensure the thumbnail path is defined
    const thumbnail = req.files?.thumbnail[0].path;
    // console.log(thumbnail)
    if (!thumbnail) {
        throw new apiError(400, "thumbnail is not defined");
    }
    
    try {
        // Upload the video file to Cloudinary
        const uploadVideoResponse = await uploadOnCloudinary(videoFilepath);
        // console.log(uploadVideoResponse)
        if (!uploadVideoResponse) {
            throw new apiError(400, "video file is not uploaded on Cloudinary");
        }

        // Extract the duration from the Cloudinary response
        const duration = uploadVideoResponse.duration;
        // console.log(duration)
        if (duration === undefined) {
            throw new apiError(400, "duration is not available from Cloudinary response");
        }

        // Upload the thumbnail to Cloudinary
        const uploadThumbnailResponse = await uploadOnCloudinary(thumbnail);
        // console.log(uploadThumbnailResponse)
        if (!uploadThumbnailResponse) {
            throw new apiError(400, "thumbnail is not uploaded on Cloudinary");
        }

        // Create the video record in the database
        const video = await Video.create({
            videoFile: uploadVideoResponse.url,
            thumbnail: uploadThumbnailResponse.url,
            title,
            description,
            duration,
            owner:user
        });
        // console.log(video)
        if (!video) {
            throw new apiError(400, "video has not been published successfully");
        }

        res.status(201).json(new apiResponse(201, video, "video has been uploaded successfully"));
    } catch (error) {
        console.error(error);
        throw new apiError(500, "An error occurred while publishing the video");
    }
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id\
    const response =await Video.findById(videoId);
    if(!response) throw new apiError(400,"video not found");
    res.status(200).json(new apiResponse(201,response,"video found successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    
    // Check if a new thumbnail file is provided
    
    const newThumbnail = req.file?.path;
    if (!newThumbnail) {
        throw new apiError(400, "Thumbnail is not defined");
    }

    try {
        // Upload the new thumbnail to Cloudinary
        const uploadedNewThumbnail = await uploadOnCloudinary(newThumbnail);
        if (!uploadedNewThumbnail) {
            throw new apiError(400, "Thumbnail upload error");
        }

        // Update the video details in the database
        const response = await Video.findByIdAndUpdate(
            videoId,
            {
                $set: {
                    title,
                    description,
                    thumbnail: uploadedNewThumbnail.url,
                },
            },
            { new: true }
        );

        if (!response) {
            throw new apiError(400, "Update not successful");
        }

        res.status(200).json(new apiResponse(201, response, "Update successful"));
    } catch (error) {
        console.error(error);
        throw new apiError(500, "An error occurred while updating the video");
    }
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const response=await Video.findByIdAndDelete(videoId);
    if(!response) throw new apiError(400,"video deleted unsuccessfully")
        res.status(200).json(new apiResponse(200,{},"video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Get the current video record
    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found");
    }

    // Toggle the isPublished field
    video.isPublished = !video.isPublished;

    // Save the updated video
    const updatedVideo = await video.save();
    if (!updatedVideo) {
        throw new apiError(500, "Toggle failed");
    }

    res.status(200).json(new apiResponse(200, updatedVideo.isPublished, "Toggle successful"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}