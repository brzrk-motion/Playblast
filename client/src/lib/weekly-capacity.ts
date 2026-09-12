import { createLocalStorageNumberStore } from "@/hooks/use-local-storage-number"

export const WEEKLY_CAPACITY_STORAGE_KEY = "playblast-weekly-capacity-hours"

const store = createLocalStorageNumberStore(
  WEEKLY_CAPACITY_STORAGE_KEY,
  "playblast-weekly-capacity-change",
)

export const getWeeklyCapacityHours = store.read
export const setWeeklyCapacityHours = store.write
export const useWeeklyCapacityHours = store.useValue
