import { sendChatMessages, runSecurityAudit } from "../services/ai.service.js";
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

export const securityAudit= async(req, res)=>{
  try{
    const { code }=req.body;
    if(!code) return res.status(400).json({ success: false, error: "code is required"});
    const result= await runSecurityAudit(code);
    res.json({ success: true, data: result });
  }catch (error){
    console.error("error in securityAudit",error);
    res.status(500).json({success: false, error: "security audit failed"});
  }
  };
  export const followUp=async(req,res)=>{
  try{
    const { sessionId, question}= req.body;

    if ( !sessionId || !question){
    return res.status(400).send("sessionId and questions are required");
  }
  const response = await sendChatMessages(sessionId,question);

  res.json({success:true,data:response});

}catch(error){
  console.error("error in followUp:", error);
  res.status(500).send("internal server error");
}
};