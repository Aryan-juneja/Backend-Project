import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';
import { User } from "../models/user.model.js";


// const test=async(_id)=>{
//     try {
//         return jwt.sign({
//             _id:_id,
//         },
//         process.env.ACCESS_TOKEN_SECRET,
//         {
//             expiresIn:process.env.ACCESS_TOKEN_EXPIRY
//         }
//     )
//     } catch (error) {
//         console.log("Error incoming",error.message);
//     }
// }

export const verifyJwt = asyncHandler(async (req, res, next) => {
    // const generatedToken = await test("12345");
    //     console.log("Generated Token:", generatedToken);
        // const check =jwt.verify(generatedToken,process.env.ACCESS_TOKEN_SECRET);
        // console.log(check)
    const token = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");
    
    // console.log("Extracted Token:", token);
    // console.log("ACCESS_TOKEN_SECRET:", process.env.ACCESS_TOKEN_SECRET);

    if (!token) {
        console.error("Token not found: Unauthorized access");
        throw new apiError(400, "Unauthorized access");
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token,process.env.REFRESH_TOKEN_SECRET);
        // console.log("Decoded Token:", decodedToken);
    } catch (error) {
        console.error("Token verification failed:", error.message);
        // Provide more detailed error information
        throw new apiError(401, `Invalid access token: ${error.message}`);
    }

    if (!decodedToken) {
        console.error("Decoded token is empty or invalid");
        throw new apiError(401, "Invalid access token");
    }

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    if (!user) {
        console.error("User not found for the given token");
        throw new apiError(401, "Invalid access token");
    }
    req.user = user;
    next();
});
