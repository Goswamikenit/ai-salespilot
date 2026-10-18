import { Router } from "express";
import { createOrganization,
        getOrganizations,
        getOrganizationById,
        updateOrganization,
        deleteOrganization
 } from "../controllers/organization.controller";

const router = Router();
import { authenticateToken } from "../middlewares/auth.middleware";


router.post("/", authenticateToken, createOrganization);

router.get("/", authenticateToken, getOrganizations);

router.get("/:id", authenticateToken, getOrganizationById);

router.put("/:id", authenticateToken, updateOrganization);

router.delete("/:id", authenticateToken, deleteOrganization);



export default router;