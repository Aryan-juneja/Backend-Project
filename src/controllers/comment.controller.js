import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    const userId=req.user?._id;
    const response =await Comment.find({owner:userId,video:videoId})
    if(!response) throw new apiError(400,"No data present");
    res.status(200).json(new apiResponse(201,response,"Video comments"))
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {content} =req.body
    // console.log(content)
    const userId=req.user?._id
    if(!userId) throw new apiError(400,"user not found");
    const {videoId} =req.params;
    if(!videoId) throw new apiError(400,"videoId wrong");
    const video =await Video.findById(videoId);
    if(!video) throw new apiError(400,"video not found");
    const response =await Comment.create({
        content:content,
        video:videoId,
        owner:userId
    })
    if(!response) throw new apiError(400,"comment does not create");
    res.status(200).json(new apiResponse(201,{},"comment added successfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params; // Extract tweetId directly
    const { content } = req.body;
    console.log(commentId)
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new apiError(400, "Invalid comment ID format");
    }

    const objectId = new mongoose.Types.ObjectId(commentId);

    try {
        const response = await Comment.findByIdAndUpdate(
            objectId,
            { $set: { content } },
            { new: true }
        );

        if (!response) {
            throw new apiError(400, "Update not successful");
        }

        res.status(200).json(new apiResponse(200, response, "Update successful"));
    } catch (error) {
        console.error(error);
        throw new apiError(500, "An error occurred while updating the tweet");
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} =req.params;
    if(!commentId) throw new apiError("400","tweetId not found")
    const response =await Comment.findByIdAndDelete(commentId);
    if(!response) throw new apiError("400","Comment deleted unsuccessfully");    
    res.status(200).json( new apiResponse(201),{},"Comment deleted successfully")
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }