import { useState, useEffect, useMemo } from "react";
import {
  FALLBACK_DRIVER_STATUSES,
  fetchDriverStatuses,
  createDriverStatusHelpers,
} from "../lib/driverStatuses";

export function useDriverStatuses() {
  const [statuses, setStatuses] = useState(FALLBACK_DRIVER_STATUSES);

  useEffect(() => {
    fetchDriverStatuses()
      .then(setStatuses)
      .catch(() => {});
  }, []);

  return useMemo(() => createDriverStatusHelpers(statuses), [statuses]);
}
