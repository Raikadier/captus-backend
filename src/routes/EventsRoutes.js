import express from "express";
import { EventsController } from "../controllers/EventsController.js";
import { validate } from "../middlewares/validate.js";
import { CreateEventSchema, UpdateEventSchema } from "../shared/schemas.js";

const router = express.Router();
const eventsController = new EventsController();

router.get("/",                eventsController.getAll.bind(eventsController));
router.get("/upcoming",       eventsController.getUpcoming.bind(eventsController));
router.get("/date-range",     eventsController.getByDateRange.bind(eventsController));
router.get("/:id",            eventsController.getById.bind(eventsController));
router.post("/",  validate(CreateEventSchema), eventsController.create.bind(eventsController));
router.put("/:id", validate(UpdateEventSchema), eventsController.update.bind(eventsController));
router.delete("/:id",         eventsController.delete.bind(eventsController));
router.post("/check-upcoming", eventsController.checkUpcomingEvents.bind(eventsController));

export default router;
