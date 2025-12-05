import mongoose from "mongoose";

const connectDb = async()=>{
    try {
        let connect = await mongoose.connect(process.env.MONGO_URL)
        console.log('Database connected')
    } catch (error) {
        console.log(error?.message)
    }
}


export default connectDb