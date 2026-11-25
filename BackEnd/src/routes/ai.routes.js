import express from "express";
import { getReview, followUp, securityAudit} from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/get-review", getReview);
router.post("/follow-up", followUp);
router.post("/security-audit", securityAudit)

export default router;


