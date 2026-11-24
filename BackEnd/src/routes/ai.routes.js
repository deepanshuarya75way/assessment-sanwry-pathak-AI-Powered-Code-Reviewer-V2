import express from "express";
import { getReview, followUp} from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/get-review", getReview);
router.post("/follow-up", followUp);

export default router;


