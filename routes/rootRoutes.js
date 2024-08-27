import express from "express";
const router = express.Router();

import { get_root, get_aboutUs } from "../controllers/rootController.js";

router.get('/', get_root);

router.get('/aboutUs', get_aboutUs);


export default router;