import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"

const isUserOwnerofPlaylist = async(playlistId,userId)=>{

    try {
        const playlist = await Playlist.findById(playlistId);

        if(!playlist){
            throw new apiError(400,"playlist doesn't exist")
        }
        
        if(playlist?.owner.toString() !== userId.toString()){
           
            return false;
        }
        
        return true;
    } catch (e) {
        throw new apiError(400,e.message || 'Playlist Not Found')
    }
    
}

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    
    //TODO: create playlist
    if(!name){
        throw new apiError(400,"Name is Required to Create a Playlist!!")
    }
    let playlistDescription = description || " ";
    try {
        const playlist = await Playlist.create({
            name,
            description : playlistDescription,
            owner:req.user?._id,
            videos:[]
        })
        if(!playlist){
            throw new apiError(500,"Something error happened while trying to create a playlist")
        }
        return res
        .status(201)
        .json(new apiResponse(200,playlist,"Playlist Created Successfully"))
    } catch (error) {
        throw new apiError(500,error.message || "Unable to create playlist ")
    }    
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!userId){
        throw new apiError(400,"userId is required !!!");
    }
    try {
        const user = await User.findById(userId);
    
        if(!user){
            throw new apiError(404,"User not found ")
        }
        const playlist = await Playlist.aggregate([
            {
                $match:{
                    owner:user?._id
    
                }
            },
            {
                $project:{
                   _id : 1,
                   name:1,
                   description:1,
                   owner:1,
                   createdAt:1,
                   updatedAt:1,
                   videos:{
                    $cond:{
                        if:{$eq:["$owner",new mongoose.Types.ObjectId(req?.user?._id)]},
                        then:"$videos",
                        else:{
                            $filter:{
                                input:"$videos",
                                as:"video",
                                cond:{
                                    $eq:["$video.isPublished",true ]
                                }

                            }
                        }

                    }
                   }
                }

            }
        ])
        if(!playlist ){
            throw new apiError(404,"There is no Playlist made by this user")
        }
    
        return res
        .status(200)
        .json(new apiResponse(200,playlist,"Playlist Fetched Successfully"))
    } catch (error) {
        throw new apiError(500,error.message || "Unable to fetch Playlist or playlist doesn't exist ")
    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!playlistId){
        throw new apiError(400,"playlistId is required!!!")
    }
    try {
        const playlist = await Playlist.aggregate([
            {
                $match:{
                   _id:new mongoose.Types.ObjectId(playlistId)
    
                }
            },{//if the user is owner then he can see the playlist with the unpublished video of himself
                //but others can see the published video only
                $project:{
                    name:1,
                    description:1,
                    owner:1,
                    videos:{
                          $cond:{
                            if:{
                                $eq:["$owner",new mongoose.Types.ObjectId(req?.user?._id)]
                            },
                            then: "$videos",
                            else:{
                                $filter:{
                                    input:"$videos",
                                    as:"video",
                                    cond:{
                                        $eq:["$video.isPublished" , true]
                                    }
                                }
                            }
                          }
                    },
                    createdAt:1,
                    updatedAt:1
                }
            }
        ])
        
        if(!playlist){
            throw new apiError(404,"Playlist Not Found")
        }
        return res
        .status(200)
        .json(new apiResponse(200,playlist,"Playlist Fetched Successfully"))
    } catch (error) {
        throw new apiError(500,error.message || "playlistId is not correct" )
    }
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!playlistId || !videoId) throw new apiError(400,"both playlistId or videoId is required");

    const owner =isUserOwnerofPlaylist(playlistId,req.user?._id);
    if(!owner) throw new apiError(410,"unauthorized access");
    const video =await Video.findById(videoId);
    if(!video || ( !(video.owner.toString() === req.user?._id.toString())  && !video?.isPublished) ){
        throw new apiError(404,"Video Not Found");
    }
    const playlist = await Playlist.findById(playlistId)
    if(playlist.videos.includes(videoId)){
        return res
        .status(200)
        .json(new apiResponse(200,{},"Video Is  already present In Playlist"))
    }
    const addedplaylist = await Playlist.updateOne({
        _id : new mongoose.Types.ObjectId(playlistId)
    },{
        $push:{videos:videoId}
    })
    if(!addedplaylist){
        throw new apiError(500,"Unable to add the video to the playlist")
    }

    return res
    .status(200)
    .json(new apiResponse(200,addedplaylist,"Video Successfully Added To Playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // Validate inputs
    if (!playlistId || !videoId) {
        throw new apiError(400, "Both videoId and playlistId are required");
    }

    // Verify ownership of the playlist
    const isOwner = await isUserOwnerofPlaylist(playlistId, req.user?._id);
    if (!isOwner) {
        throw new apiError(403, "Unauthorized access");
    }

    // Find the video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found");
    }

    // Find the playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new apiError(404, "Playlist not found");
    }

    // Check if the video is in the playlist
    if (!playlist.videos.includes(videoId)) {
        throw new apiError(404, "Video not found in playlist");
    }

    // Only unpublished videos can be removed by this function
    if (!video.isPublished) {
        throw new apiError(400, "Only unpublished videos can be removed");
    }

    // Remove the video from the playlist
    const updateResult = await Playlist.updateOne(
        { _id: playlistId },
        { $pull: { videos: videoId } }
    );

    if (updateResult.nModified === 0) {
        throw new apiError(500, "Unable to remove video, please try again");
    }

    return res.status(200).json(new apiResponse(200, {}, "Video removed from the playlist successfully"));
});


const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!playlistId){
        throw new apiError(400,"playlistId is required!!!")
    }
    try {
        const userOwner = await isUserOwnerofPlaylist(playlistId,req?.user?._id)
        if(!userOwner){
            throw new apiError(300,"Unauthorized Access")
        }
        const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
        if(!deletedPlaylist){
            throw new apiError(500,"Unable to delete the Playlist")
        }
        return res
        .status(200)
        .json(new apiResponse(200,{},"Playlist Deleted Successfully"))
    } catch (error) {
        throw new apiResponse(500,error.message || "playlistId is not correct")
    }
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!playlistId){
        throw new apiError(400,"playlistId is required!!!")
    }
   try {
     const userOwner = await isUserOwnerofPlaylist(playlistId,req?.user?._id)
     if(!userOwner){
         throw new apiError(300,"Unauthorized Access")
     }
     if(!name || !description){
         throw new apiError(404,"Name and Description Both are required!!!!")
     }
     const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
         $set:{
             name:name,
             description:description
         }
     })
     
     if(!updatedPlaylist){
         throw new apiError(500,"Unable to update the Playlist")
     }
     return res
     .status(200)
     .json(new apiResponse(200,updatedPlaylist,"Playlist Updated Successfully"))
 
   } catch (error) {
      throw new apiResponse(500,error.message || "playlistId is not correct")
   }
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}