import { sendChatMessages } from "../services/ai.service.js";
import { randomUUID } from "crypto";

export const getReview = async (req, res) => {
  try {
    const { code } = req.body;
    

    if (!code) {
      return res.status(400).send("code is required");
    }

    const sessionId = randomUUID();
    const prompt = `Please review the following code:\n\n${code}`;
    const response = await sendChatMessages(sessionId,prompt);

    res.json({success: true,data: response,sessionId});


  } catch (error) {
    console.error("Error in getReview:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const followUp = async (req, res)=>{
  try{
    const { sessionId, question}= req.body;

    if ( !sessionId || !question){
    return res.status(400).send("sessionId and questions are required");
  }
  const response = await sendChatMessage(sessionId,question);

  res.json({success:true,data:response});

}catch(error){
  console.error("error in followUp:", error);
  res.status(500).send("internal server error");
}
};