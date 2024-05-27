import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/ApiResponse.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user?._id; // Assuming you have user ID in req.user

    // Check if the channel exists
    const channel = await User.findById(channelId);
    if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if the subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    });

    if (existingSubscription) {
        // Unsubscribe
        await Subscription.deleteOne({ _id: existingSubscription._id });
        return res.status(200).json({ message: 'Unsubscribed successfully' });
    } else {
        // Subscribe
        await Subscription.create({
            subscriber: userId,
            channel: channelId
        });
        return res.status(201).json( new apiResponse(201, {}, "Subscribed successfully"));
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    const subscribers = await Subscription.find({ channel: subscriberId }).populate('subscriber');
    if (!subscribers || subscribers.length === 0) {
        throw new apiError(404, "No subscribers found");
    }

    const subscriberUsers = subscribers.map(sub => sub.subscriber);
    res.status(200).json(new apiResponse(200, subscriberUsers, "Channel subscribers"));

})

// const getUserChannelSubscribers = asyncHandler(async (req, res) => {
//     const { subscriberId } = req.params;
//     if (!subscriberId) {
//         throw new apiError(400, "channelId is required!!");
//     }
//     try {
//         const subscribers = await Subscription.aggregate([
//             {
//                 $match: {
//                     channel: new mongoose.Types.ObjectId(subscriberId),
//                 },
//             },
//             {
//                 $group: {
//                     _id: "channel",
//                     subscribers: { $push: "$subscriber" },
//                 },
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     subscribers: 1,
//                 },
//             },
//         ]);

//         if (!subscribers || subscribers.length === 0) {
//             return res
//                 .status(200)
//                 .json(new apiResponse(200, [], "No subscribers found for the channel"));
//         }
//         return res
//             .status(200)
//             .json(new apiResponse(200, subscribers, "All Subscribers fetched Successfully!!"));

//     } catch (e) {
//         throw new apiError(500, e?.message || "Unable to fetch subscribers!");
//     }
// });

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const userId = req.user?._id; // Assuming you have user ID in req.user

    if (!userId) throw new apiError(400, "User ID is missing");

    // Find all subscriptions for the user
    const subscriptions = await Subscription.find({ subscriber: userId }).populate('channel');

    if (!subscriptions || subscriptions.length === 0) {
        throw new apiError(404, "No subscriptions found");
    }
    
    const subscribedChannels = subscriptions.map(subscription => subscription.channel);
    
    res.status(200).json(new apiResponse(200, subscribedChannels, "Your subscribed channels"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}