# Risk score

A project-defined operational indicator from 0 to 100. It is not a scientifically validated probability of product
damage. It is recalculated from stored alerts and the latest state of the device.

| Factor | Max points | Full points when |
|---|---|---|
| Temperature deviation | 25 | largest deviation outside limits reaches 5 °C |
| Excursion duration | 30 | total time outside limits reaches 60 minutes |
| Sensor failures | 15 | product probe (DS18B20) failing, or 5 points per other failing sensor, capped |
| Low battery | 10 | estimated battery at or below the critical level (half points at or below the low level) |
| Shock events | 10 | 2 or more shock events |
| Disconnection | 10 | 30 minutes offline |

Partial values scale linearly up to the maximum. The total is rounded and clamped to 0 to 100.

| Score | Level |
|---|---|
| 0 to 24 | low |
| 25 to 49 | moderate |
| 50 to 74 | high |
| 75 to 100 | critical |

The thresholds live in `backend/src/services/riskScore.js`. The battery levels come from the Settings page.