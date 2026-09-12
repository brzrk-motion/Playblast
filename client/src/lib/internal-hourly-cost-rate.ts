import { createLocalStorageNumberStore } from "@/hooks/use-local-storage-number"

export const INTERNAL_HOURLY_COST_RATE_STORAGE_KEY = "playblast-internal-hourly-cost-rate"

const store = createLocalStorageNumberStore(
  INTERNAL_HOURLY_COST_RATE_STORAGE_KEY,
  "playblast-internal-hourly-cost-rate-change",
)

export const getInternalHourlyCostRate = store.read
export const setInternalHourlyCostRate = store.write
export const useInternalHourlyCostRate = store.useValue
