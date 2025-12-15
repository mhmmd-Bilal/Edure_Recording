import express from 'express'
import { approveStudent, createClass, sendRequest, studentApprovelCheck } from '../controllers/classRoomController.js'

const classRoutes = express.Router()

classRoutes.post("/create",createClass)

classRoutes.post("/request-join",sendRequest)

classRoutes.post("/approve",approveStudent)

classRoutes.get("/check/:roomId/:studentId",studentApprovelCheck)

export default classRoutes