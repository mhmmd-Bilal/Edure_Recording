import axios from "axios";

async function generateToken(uuid,region = "us-sv") {
  try {
    const options = {
      method: "POST",
      url: `https://api.netless.link/v5/tokens/rooms/${uuid}`,
      headers: {
        token: process.env.AGORA_WHITEBOARD_SDK_TOKEN,  
        "Content-Type": "application/json",
        region: region,  
      },
      data: {
        lifespan: 3600000,  
        role: "admin",   
      },
    };

    const response = await axios(options);
    return response.data; 
  } catch (error) {
    console.error(
      "Error generating token:",
      error.response?.data || error.message
    );
    return null;
  }
}

export { generateToken };
