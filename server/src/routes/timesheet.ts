import { Router } from "express"
import { getWeekStartFromDate, isIsoDate } from "../lib/timesheet.js"
import { getWeeklyTimesheet } from "../storage/index.js"

const timesheetRouter = Router()

timesheetRouter.get("/", (req, res) => {
  const weekStartParam = req.query.weekStart

  let weekStart: string
  if (weekStartParam === undefined || weekStartParam === "") {
    weekStart = getWeekStartFromDate()
  } else if (typeof weekStartParam !== "string" || !isIsoDate(weekStartParam)) {
    res.status(400).json({ error: "weekStart must be a valid YYYY-MM-DD date." })
    return
  } else {
    weekStart = weekStartParam
  }

  res.json(getWeeklyTimesheet(weekStart))
})

export default timesheetRouter
