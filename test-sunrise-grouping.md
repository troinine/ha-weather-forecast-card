# Sunrise/Sunset Grouping Analysis

## Current Behavior

Based on the code analysis:

### Data Flow

1. **Raw Forecast Data** (from Home Assistant)
   - Hourly entries, e.g., 07:00, 08:00, 09:00, 10:00, etc.
   - Each has a `datetime` and `condition` (e.g., "clear-night", "sunny")

2. **`aggregateHourlyForecastData()` in `weather.ts`** (Line 452)
   - Groups consecutive hours with **same condition**
   - Stops grouping when condition changes
   - Creates `groupEndtime` = start of next entry (not end of hour!)
   - Example:
     - 07:00 clear-night → groups until condition changes
     - 08:00 clear-night (same condition) → continues grouping
     - 09:00 sunny → breaks here, creates group 07:00-09:00

3. **`groupForecastByCondition()` in `helpers.ts`** (Line 125)
   - Takes the already-aggregated forecast
   - Further splits based on:
     - Condition change
     - Day/night change (`isNightTime`)
     - Sunrise/sunset crossing between entries

### The Problem

**Scenario: Sunrise at 08:27**

Raw forecast data:
```
07:00 - condition: "clear-night"
08:00 - condition: "clear-night"  
09:00 - condition: "sunny"
```

Step 1: `aggregateHourlyForecastData()` with `hourly_group_size = 3`
- Groups 07:00 + 08:00 (both clear-night, groupSize allows it)
- Entry: `{datetime: "07:00", groupEndtime: "08:00", condition: "clear-night"}`
- Groups just 08:00 (only 1 hour left before condition change)
- Entry: `{datetime: "08:00", groupEndtime: "09:00", condition: "clear-night"}`
- Groups 09:00+
- Entry: `{datetime: "09:00", groupEndtime: "10:00", condition: "sunny"}`

Step 2: `groupForecastByCondition()` checks sun crossing
- Between 07:00-08:00? Sunrise at 08:27 is NOT in (07:00, 08:00]
- Between 08:00-09:00? Sunrise at 08:27 IS in (08:00, 09:00] → **SPLITS HERE**

Result:
- Group 1: 07:00-07:59 (night)
- Group 2: 08:00-08:59 (night, but crosses sunrise)
- Group 3: 09:00+ (day)

### Why This Happens

The issue is in how `groupEndtime` is set. In `aggregateHourlyForecastData()`:

```typescript
const nextEntry = forecast[i];
const endDate = nextEntry
  ? new Date(nextEntry.datetime)  // <-- This is the START of next entry
  : lastEntryDate;

aggregatedEntry.groupEndtime = endDate.toISOString();
```

So `groupEndtime` represents when the NEXT forecast entry starts, not when THIS forecast period actually ends.

For hourly data:
- 07:00 entry has `groupEndtime = "08:00"` (start of next)
- 08:00 entry has `groupEndtime = "09:00"` (start of next)

When checking sun crossing:
```typescript
const start = toDate(
  forecast[i - 1].groupEndtime ?? forecast[i - 1].datetime
).getTime();  // = 08:00
const end = toDate(forecast[i].datetime).getTime();  // = 09:00
```

This checks if sunrise/sunset is in (08:00, 09:00] which it is!

## The Root Cause

The problem is that `aggregateHourlyForecastData()` creates TWO separate groups for the same condition when there's a size constraint:

1. Group 1: 07:00 with `groupEndtime = 08:00`
2. Group 2: 08:00 with `groupEndtime = 09:00`

Both have condition "clear-night", but they're separate aggregated entries because the grouping stopped at max size or ran out of matching conditions.

Then `groupForecastByCondition()` sees sunrise crossing between these two groups and adds ANOTHER split.

## Proposed Solutions

### Option A: Split Exactly at Sunrise (8:27)

**Pros:**
- Most accurate representation
- Matches actual sun event time
- No artificial hour boundaries

**Cons:**
- Requires sub-hour precision
- May need to split existing aggregated entries
- More complex implementation

**Implementation:**
Would need to modify aggregation to:
1. Check for sun events WITHIN each group
2. Split aggregated groups at exact sun time
3. Create intermediate entries with fractional hours

### Option B: Round to Full Hours (Simpler)

**Pros:**
- Simpler implementation
- Aligns with hour-based forecast data
- Easier to understand visually

**Cons:**
- Less accurate (sunrise at 8:27 → shows day starting at 9:00)
- May show night icon when it's actually daytime

**Implementation:**
Change the sun crossing logic to check if sunrise/sunset is in the CURRENT hour:
- If 08:00 entry contains sunrise at 08:27
- Mark that entry as "transitional" or force it to day mode
- Don't create an extra split

### Option C: Prevent Double-Grouping (Recommended)

**Pros:**
- Fixes the root cause
- No extra groups for same condition
- Maintains accuracy

**Cons:**
- Needs refactoring of aggregation logic

**Implementation:**
Modify `aggregateHourlyForecastData()` to not create separate groups for the same condition. When condition stays the same, keep grouping even if it exceeds groupSize.

OR: Remove the condition-based grouping from `aggregateHourlyForecastData()` and let `groupForecastByCondition()` handle it all.

## Recommendation

**Option C with refinement to Option B:**

1. Let `aggregateHourlyForecastData()` group by SIZE only (not by condition)
2. Let `groupForecastByCondition()` handle all condition + day/night splits
3. For sun crossing: assign the entire hour to either day or night based on majority
   - If sunrise at 8:27, the 8:00 hour is 33 minutes day, 27 minutes night → day wins
   - OR simpler: if sunrise/sunset is in this hour, use the END state (after sun event)

This would give:
- Night group: 07:00-07:59
- Day group: 08:00+ (even though sunrise is at 08:27, we round to the hour)
