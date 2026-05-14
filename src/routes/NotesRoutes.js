import express from "express";
import { NotesController } from "../controllers/NotesController.js";
import { validate } from "../middlewares/validate.js";
import { CreateNoteSchema, UpdateNoteSchema } from "../shared/schemas.js";

const router = express.Router();
const notesController = new NotesController();

router.get("/",       notesController.getAll.bind(notesController));
router.get("/:id",   notesController.getById.bind(notesController));
router.post("/",     validate(CreateNoteSchema), notesController.create.bind(notesController));
router.put("/:id",   validate(UpdateNoteSchema), notesController.update.bind(notesController));
router.put("/:id/toggle-pin", notesController.togglePin.bind(notesController));
router.delete("/:id", notesController.delete.bind(notesController));

export default router;
