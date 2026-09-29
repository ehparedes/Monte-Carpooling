import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import tripsRouter from "./trips";
import bookingsRouter from "./bookings";
import chatRouter from "./chat";
import ratingsRouter from "./ratings";
import adminRouter from "./admin";
import pushRouter from "./push";
import tripRequestsRouter from "./trip-requests";
import storageRouter from "./storage";
import sponsorsRouter from "./sponsors";
import communityRouter from "./community";
import { communityGate } from "../middlewares/communityGate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(communityGate);
router.use(authRouter);
router.use(usersRouter);
router.use(tripsRouter);
router.use(bookingsRouter);
router.use(chatRouter);
router.use(ratingsRouter);
router.use(adminRouter);
router.use(pushRouter);
router.use(tripRequestsRouter);
router.use(storageRouter);
router.use(sponsorsRouter);
router.use(communityRouter);

export default router;
