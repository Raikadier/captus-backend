import express from "express";
import { TaskController } from "../controllers/TaskController.js";
import { validate } from "../middlewares/validate.js";
import { CreateTaskSchema, UpdateTaskSchema } from "../shared/schemas.js";

const router = express.Router();
const taskController = new TaskController();

router.get("/",                         taskController.getAll.bind(taskController));
router.get("/pending",                  taskController.getPending.bind(taskController));
router.get("/:id",                      taskController.getById.bind(taskController));
router.post("/",     validate(CreateTaskSchema), taskController.create.bind(taskController));
router.put("/:id",   validate(UpdateTaskSchema), taskController.update.bind(taskController));
router.delete("/:id",                   taskController.delete.bind(taskController));
router.put("/:id/complete",             taskController.complete.bind(taskController));
router.delete("/category/:categoryId",  taskController.deleteByCategory.bind(taskController));

export default router;
