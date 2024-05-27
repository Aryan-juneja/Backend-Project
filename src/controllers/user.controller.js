import {asyncHandler} from '../utils/asyncHandler.js'
import {apiError} from '../utils/apiError.js'
import { User } from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/Cloudinary.js'
import {apiResponse} from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose';

const generateAccessAndRefreshToken=async(userId)=>{
    try {
        const userid =await User.findById(userId);
        const accessToken =await userid.generateAcessToken();
        const refreshToken = await userid.generateRefreshToken();

        userid.refreshToken =refreshToken;
        await userid.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new apiError(500,"something went wrong");
    }
}

const registerUser =asyncHandler( async (req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {username,email,Fullname,password} =req.body;
    // console.log("email",email);
    // console.log(req.body);
    // console.log("*************************************************************************");
    if(
        [username,email,Fullname,password].some((feild)=> feild?.trim()==="")
    ){
        throw new apiError(400,"all feilds are required");
    }

    const userExist = await User.findOne({
        $or:[{username},{email}]
    })

    if(userExist){
        throw new apiError(408,"User already exists");
    }

    const avatarPath =req.files?.avatar[0]?.path;
    
    // console.log(req.files);
    // console.log("*************************************************************************");

    let coverImagePath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImagePath=req.files?.coverImage[0]?.path
    }

    if(!avatarPath){
        throw new apiError(400,"avatar not found");
    }

    const uploadedAvatar =await uploadOnCloudinary(avatarPath);
    const uploadedCoverImage =await uploadOnCloudinary(coverImagePath);

    if(!uploadedAvatar){
        throw new apiError(400,"avatar not found");
    }

    // console.log(uploadedAvatar);
    // console.log("*************************************************************************");
    
    const user = await User.create({
        Fullname,
        avatar: uploadedAvatar.url,
        coverImage: uploadedCoverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser=asyncHandler(async (req,res)=>{
     // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {username,email,password} =req.body;
    if(!username && !email) throw new apiError(400,"username or email is required");

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new apiError(404,"user does not exist");
    }
    
    const checkedPassword = await user.isPasswordCorrect(password);

    if(!checkedPassword){
        throw new apiError(401,"invalid credentials");
    }

    const {accessToken,refreshToken} =await generateAccessAndRefreshToken(user._id);

    const loggedInUser =await User.findById(user._id).select("-password -refreshToken");
    const Options ={
        httpOnly:true,
        secure:true
    }
    res.status(200)
    .cookie("acceesToken",accessToken,Options)
    .cookie("refreshToken",refreshToken,Options)
    .json(new apiResponse(200,{
        user:loggedInUser,accessToken,refreshToken
    },"User Logged In Successfully"))
})

const logoutUser=asyncHandler(async(req,res)=>{
   
    await User.findByIdAndUpdate(req.user._id,
        {
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    })

    const Options ={
        httpOnly:true,
        secure:true
    }

    return res.status(200).
    clearCookie("acceesToken",Options).
    clearCookie("refreshToken",Options).
    json( new apiResponse(201,{},"user Logged Out Successfully"))       
})

const refreshAccessToken =asyncHandler(async (req,res)=>{
    const incomingRefreshToken  =  req.cookies?.refreshToken || req.body?.refreshToken;
    console.log("incoming refresh token",incomingRefreshToken);
    if(!incomingRefreshToken){
    throw new apiError(400,"unauthorized refreshToken");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        
        if(!decodedToken){
            throw new apiError(400,"unauthorized token");
        }
        console.log("decoded token:",decodedToken);
        const user =await User.findById(decodedToken?._id);

        if(!user){
            throw new apiError(400,"user with this does not exist");
        }
        console.log(user);
        if(incomingRefreshToken!==user?.refreshToken){
            throw new apiError(401,"refresh token is not matched")
        }

        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken,newRefreshToken} =generateAccessAndRefreshToken(user?._id);

        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new apiResponse(201,{accessToken,refreshToken:newRefreshToken},"Access token refreshed"));
    
    } catch (error) {
        throw new apiError(401,error?.message || "invalid refresh token")
    }

})

const changeCurrentPassword=asyncHandler(async(req,res)=>{

    const {oldPassword,newPassword} =req.body
   
    const user =await User.findById(req.user?._id);
    const isPasswordCorrect =user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new apiResponse(400,"password Incorrect");
    }
    user.password =newPassword;
    await user.save({validateBeforeSave:true});
    return res.status(200).json(new apiResponse(201,{},"password changes correctly"));
})

const getCurrentUser =asyncHandler(async(req,res)=>{
    res.status(200).json(new apiResponse(201,req.user,"User fetched Successfully"))
})

const updateAccountDetails =asyncHandler(async(req,res)=>{
    const {Fullname,email}=req.body
    if(!Fullname || !email){throw new apiError(400,"fullname or email is required")};
    const user =await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            Fullname,email
        }
    },{new:true}).select("-password");
    return res
    .status(200)
    .json(new apiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar =asyncHandler(async(req,res)=>{
    const localPath =req.file?.path;
    if(!localPath) throw new apiError(400,"local path is undefined");
   const avatar = uploadOnCloudinary(localPath);
    if(!avatar) throw new apiError(400,"avatar url is undefined");
    const user =await User.findByIdAndUpdate(req.user?._id,{$set:{avatar:avatar.url}},{new:true}).select("-password")
    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage  =asyncHandler(async(req,res)=>{
    const localPath =req.file?.path;
    if(!localPath) throw new apiError(400,"local path is undefined");
   const coverImage = uploadOnCloudinary(localPath);
    if(!avatar) throw new apiError(400,"avatar url is undefined");
    const user =await User.findByIdAndUpdate(req.user?._id,{$set:{coverImage:coverImage.url}},{new:true}).select("-password")
    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Avatar image updated successfully")
    )
})
const getUserChannelProfile =asyncHandler(async(req,res)=>{
    const {username} = req.params;
    
    if(!username?.trim()){
        throw new apiError(400,"username not found");
    }

    const channel =await User.aggregate([{
        $match:{
            username:username?.toLowerCase()
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribeTo"
        }
    },
    {
        $addFields:{
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribeTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        }
    },{
        $project:{
            FullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
        }
    }
])
if (!channel?.length) {
    throw new apiError(404, "channel does not exists")
}

return res
.status(200)
.json(
    new apiResponse(200, channel[0], "User channel fetched successfully")
)
})

const getWatchHistory =asyncHandler(async (req,res)=>{
    const user = User.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(req.body._idid)
                }
            },
            {
                $lookup:{
                    from:"Video",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from: "user",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline:[
                                    {
                                        $project:{
                                            Fullname: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            },
                            
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
            },
]
)

    res.status(200).json(new apiResponse(201,user[0].watchHistory),"watch history fetched successfully");
})

export {loginUser,registerUser,getWatchHistory,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,getUserChannelProfile,updateAccountDetails,updateUserAvatar,updateUserCoverImage }