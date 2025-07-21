import express from "express";
const router = express.Router();

import { identifyContact } from "../controllers/contact.controller";
router.post("/identify", identifyContact);

export default router;
