import { Router, type IRouter } from "express";
import healthRouter from "./health";
import giocatoriRouter from "./giocatori";
import partiteRouter from "./partite";

const router: IRouter = Router();

router.use(healthRouter);
router.use(giocatoriRouter);
router.use(partiteRouter);

export default router;
