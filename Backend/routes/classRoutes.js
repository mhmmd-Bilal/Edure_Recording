import express from 'express'
import { createClass } from '../controllers/classRoomController.js'

const classRoutes = express.Router()

classRoutes.post('/create',createClass)

export default classRoutes