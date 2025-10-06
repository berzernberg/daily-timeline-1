import { TaskItem, TimeRangeOverlap } from "./types";

export class OverlapDetector {
  static detectOverlaps(tasks: TaskItem[]): TimeRangeOverlap[] {
    const timeRangeTasks = tasks.filter(t => t.isTimeRange);
    const pointTasks = tasks.filter(t => !t.isTimeRange);

    const overlaps: TimeRangeOverlap[] = [];

    for (const rangeTask of timeRangeTasks) {
      if (!rangeTask.endHour || rangeTask.endMinute === undefined) continue;

      const rangeStart = rangeTask.hour * 60 + rangeTask.minute;
      const rangeEnd = rangeTask.endHour * 60 + rangeTask.endMinute;

      let overlapLevel = 0;

      for (const pointTask of pointTasks) {
        const pointTime = pointTask.hour * 60 + pointTask.minute;

        if (pointTime >= rangeStart && pointTime <= rangeEnd) {
          overlapLevel = 1;
          break;
        }
      }

      if (overlapLevel === 0) {
        for (const otherRange of timeRangeTasks) {
          if (otherRange === rangeTask) continue;
          if (!otherRange.endHour || otherRange.endMinute === undefined) continue;

          const otherStart = otherRange.hour * 60 + otherRange.minute;
          const otherEnd = otherRange.endHour * 60 + otherRange.endMinute;

          const hasOverlap = this.rangesOverlap(rangeStart, rangeEnd, otherStart, otherEnd);

          if (hasOverlap) {
            overlapLevel = 1;
            break;
          }
        }
      }

      overlaps.push({
        task: rangeTask,
        overlapLevel: overlapLevel
      });
    }

    const sortedOverlaps = overlaps.sort((a, b) => {
      const aStart = a.task.hour * 60 + a.task.minute;
      const bStart = b.task.hour * 60 + b.task.minute;
      return aStart - bStart;
    });

    for (let i = 0; i < sortedOverlaps.length; i++) {
      const current = sortedOverlaps[i];
      if (current.overlapLevel === 0) continue;

      const currentStart = current.task.hour * 60 + current.task.minute;
      const currentEnd = (current.task.endHour || 0) * 60 + (current.task.endMinute || 0);

      let maxLevelBelow = 0;

      for (let j = 0; j < i; j++) {
        const prev = sortedOverlaps[j];
        if (prev.overlapLevel === 0) continue;

        const prevStart = prev.task.hour * 60 + prev.task.minute;
        const prevEnd = (prev.task.endHour || 0) * 60 + (prev.task.endMinute || 0);

        if (this.rangesOverlap(currentStart, currentEnd, prevStart, prevEnd)) {
          maxLevelBelow = Math.max(maxLevelBelow, prev.overlapLevel);
        }
      }

      current.overlapLevel = maxLevelBelow + 1;
    }

    return sortedOverlaps;
  }

  private static rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && start2 < end1;
  }
}
