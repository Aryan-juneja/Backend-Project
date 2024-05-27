import mongoose, {isValidObjectId} from "mongoose"

import {asyncHandler} from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import { Tweet } from "../models/tweet.model.js"
import { Comment } from "../models/comment.model.js"
const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const userId=req.user?._id;
    //TODO: toggle like on video
    if(!userId || !videoId) throw new apiError(400,"videoId or userId empty")
    const video =await Video.findById(videoId);
    if(!video) throw new apiError(400,"Video not found");
    const existingLike =await Like.findOne({video:videoId,likedBy:userId});
    // console.log(videoId)
    // console.log(userId)
    // console.log(existingLike)
    if (existingLike) {
        // If like exists, remove it (unlike)
        await Like.deleteOne({ _id: existingLike._id });
        const likeCount = await Like.countDocuments({ video: videoId });
        return res.json(new apiResponse(200,{ message: 'Unliked the video', likes: likeCount },"unliked video successfully"));
    } else {
        // If like does not exist, create it (like)
        await Like.create({ video: videoId, likedBy: userId });
        const likeCount = await Like.countDocuments({ video: videoId });
        return res.json(new apiResponse(200,{ message: 'Liked the video', likes: likeCount },"Liked video successfully"));
    }   
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const userId=req.user?._id;
    if(!userId || !commentId) throw new apiError(400,"commentId or userId empty")
    const comment =await Comment.findById(commentId);
    if(!comment) throw new apiError(400,"comment not found");
    const existingLike =await Like.findOne({tweet:commentId,likedBy:userId});
    // console.log(tweetId)
    // console.log(userId)
    // console.log(existingLike)
    if (existingLike) {
        // If like exists, remove it (unlike)
        await Like.deleteOne({ _id: existingLike._id });
        const likeCount = await Like.countDocuments({ tweet: commentId });
        return res.json(new apiResponse(200,{ message: 'Unliked the comment', likes: likeCount },"unliked comment successfully"));
    } else {
        // If like does not exist, create it (like)
        await Like.create({ tweet: commentId, likedBy: userId });
        const likeCount = await Like.countDocuments({ tweet: commentId });
        return res.json(new apiResponse(200,{ message: 'Liked the comment', likes: likeCount },"Liked comment successfully"));
    }      
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId=req.user?._id;
    //TODO: toggle like on Tweet
    if(!userId || !tweetId) throw new apiError(400,"tweetId or userId empty")
    const tweet =await Tweet.findById(tweetId);
    if(!tweet) throw new apiError(400,"tweet not found");
    const existingLike =await Like.findOne({tweet:tweetId,likedBy:userId});
    // console.log(tweetId)
    // console.log(userId)
    // console.log(existingLike)
    if (existingLike) {
        // If like exists, remove it (unlike)
        await Like.deleteOne({ _id: existingLike._id });
        const likeCount = await Like.countDocuments({ tweet: tweetId });
        return res.json(new apiResponse(200,{ message: 'Unliked the Tweet', likes: likeCount },"unliked Tweet successfully"));
    } else {
        // If like does not exist, create it (like)
        await Like.create({ tweet: tweetId, likedBy: userId });
        const likeCount = await Like.countDocuments({ tweet: tweetId });
        return res.json(new apiResponse(200,{ message: 'Liked the Tweet', likes: likeCount },"Liked Tweet successfully"));
    }      
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId=req.user?._id;
    if(!userId) throw new apiError(400,"user not found");
     // Find all likes by the user
     const likes = await Like.find({ likedBy: userId });

     if (!likes || likes.length === 0) {
         return res.status(404).json({ message: "No liked videos found" });
     }
 
     // Extract video IDs from the likes
     const videoIds = likes.map(like => like.video);
 
     // Find videos with matching videoIds
     const videos = await Video.find({ _id: { $in: videoIds } });
 
     res.status(200).json({ likedVideos: videos });
    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}