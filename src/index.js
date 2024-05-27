
import connectDb from "./db/db.mjs";

import app from "./app.js";

connectDb().then(()=>
{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`app listing on port ${process.env.PORT}`)
    })
}
).catch((err)=>{
    console.log
    ("database connection failed:",err)});
