import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const id = req.user?._id;
    console.log(id)
    if(!id) throw new apiError(400,"user does not found");
    if (!content) {
        throw new apiError(400, "Content not found in the request body");
    }

    try {
        const tweet = await Tweet.create({ content ,owner:id});
        if (!tweet) {
            throw new apiError(500, "Tweet creation failed");
        }
        res.status(201).json(new apiResponse(201, tweet, "Tweet created successfully"));
    } catch (error) {
        console.error(error);
        throw new apiError(500, "An error occurred while creating the tweet");
    }
});


const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    // console.log(userId)
    const tweets = await Tweet.find({ owner:userId });
    // console.log(tweets)
    
    if (!tweets || tweets.length === 0) {
        throw new apiError(404, "No tweets found for the specified user");
    }

    res.status(200).json(new apiResponse(200, tweets, "User tweets found successfully"));
});


const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params; // Extract tweetId directly
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new apiError(400, "Invalid tweet ID format");
    }

    const objectId = new mongoose.Types.ObjectId(tweetId);

    try {
        const response = await Tweet.findByIdAndUpdate(
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
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} =req.params;
    if(!tweetId) throw new apiError("400","tweetId not found")
    const response =await Tweet.findByIdAndDelete(tweetId);
    if(!response) throw new apiError("400","Tweet deleted unSuccessfully");    
    res.status(200).json( new apiResponse(201),{},"Tweet deleted successfully")
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}