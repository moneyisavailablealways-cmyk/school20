// Automatic Timetable Generation Algorithm

export interface TimeSlot {
  period: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface SubjectRequirement {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  periodsPerWeek: number;
}

export interface GeneratedEntry {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  period: number;
  isLocked?: boolean;
}

export interface ConflictWarning {
  type: 'teacher_double_booked' | 'class_conflict' | 'unassigned_periods';
  message: string;
  details: string;
}

export interface GenerationResult {
  entries: GeneratedEntry[];
  warnings: ConflictWarning[];
  success: boolean;
}

export interface GenerationConfig {
  schoolDays: number[];
  timeSlots: TimeSlot[];
  requirements: SubjectRequirement[];
  lockedEntries: GeneratedEntry[];
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60);
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function buildTimeSlots(
  dayStartTime: string,
  periodsPerDay: number,
  periodDuration: number,
  breakAfterPeriod: number[],
  breakDuration: number[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let currentTime = dayStartTime;
  let periodCount = 0;

  for (let i = 0; i < periodsPerDay; i++) {
    // Check if we need a break before this period
    const breakIdx = breakAfterPeriod.indexOf(periodCount);
    if (breakIdx !== -1 && periodCount > 0) {
      const bDuration = breakDuration[breakIdx] || 30;
      slots.push({
        period: -1,
        startTime: currentTime,
        endTime: addMinutes(currentTime, bDuration),
        isBreak: true,
      });
      currentTime = addMinutes(currentTime, bDuration);
    }

    periodCount++;
    const endTime = addMinutes(currentTime, periodDuration);
    slots.push({
      period: periodCount,
      startTime: currentTime,
      endTime,
      isBreak: false,
    });
    currentTime = endTime;
  }

  return slots;
}

export function generateTimetable(config: GenerationConfig): GenerationResult {
  const { schoolDays, timeSlots, requirements, lockedEntries } = config;
  const warnings: ConflictWarning[] = [];
  const entries: GeneratedEntry[] = [...lockedEntries];

  // Track occupancy: teacher -> day -> period -> true
  const teacherOccupied: Map<string, Map<number, Set<number>>> = new Map();
  // Track class occupancy: class -> day -> period -> true
  const classOccupied: Map<string, Map<number, Set<number>>> = new Map();

  const getOrCreateMap = (map: Map<string, Map<number, Set<number>>>, key: string) => {
    if (!map.has(key)) map.set(key, new Map());
    return map.get(key)!;
  };

  const getOrCreateSet = (map: Map<number, Set<number>>, day: number) => {
    if (!map.has(day)) map.set(day, new Set());
    return map.get(day)!;
  };

  const isSlotFree = (teacherId: string, classId: string, day: number, period: number): boolean => {
    const teacherDays = teacherOccupied.get(teacherId);
    if (teacherDays?.get(day)?.has(period)) return false;
    const classDays = classOccupied.get(classId);
    if (classDays?.get(day)?.has(period)) return false;
    return true;
  };

  const occupySlot = (teacherId: string, classId: string, day: number, period: number) => {
    getOrCreateSet(getOrCreateMap(teacherOccupied, teacherId), day).add(period);
    getOrCreateSet(getOrCreateMap(classOccupied, classId), day).add(period);
  };

  // Register locked entries in occupancy maps
  for (const entry of lockedEntries) {
    occupySlot(entry.teacherId, entry.classId, entry.dayOfWeek, entry.period);
  }

  const teachingSlots = timeSlots.filter(s => !s.isBreak);

  // Build requirement list with remaining periods to assign
  const remainingReqs = requirements.map(r => ({
    ...r,
    remaining: r.periodsPerWeek - lockedEntries.filter(
      e => e.classId === r.classId && e.subjectId === r.subjectId
    ).length,
    assignedDays: new Set(
      lockedEntries
        .filter(e => e.classId === r.classId && e.subjectId === r.subjectId)
        .map(e => e.dayOfWeek)
    ),
  }));

  // Sort requirements: higher periods first, then alphabetically for consistency
  remainingReqs.sort((a, b) => b.remaining - a.remaining || a.className.localeCompare(b.className));

  // Assign periods using a greedy algorithm with distribution
  for (const req of remainingReqs) {
    if (req.remaining <= 0) continue;

    let assigned = 0;

    // Try to spread across days evenly
    const dayUsage = new Map<number, number>();
    schoolDays.forEach(d => dayUsage.set(d, 0));
    req.assignedDays.forEach(d => dayUsage.set(d, (dayUsage.get(d) || 0) + 1));

    for (let attempt = 0; attempt < req.remaining; attempt++) {
      // Sort days by usage (prefer days with fewer assignments for this subject)
      const sortedDays = [...schoolDays].sort(
        (a, b) => (dayUsage.get(a) || 0) - (dayUsage.get(b) || 0)
      );

      let placed = false;

      for (const day of sortedDays) {
        // Skip if already have this subject on this day (try to avoid doubles unless necessary)
        if ((dayUsage.get(day) || 0) > 0 && attempt < schoolDays.length) {
          // Try other days first
          const otherDaysAvailable = sortedDays.some(
            d => d !== day && (dayUsage.get(d) || 0) === 0 &&
            teachingSlots.some(slot => isSlotFree(req.teacherId, req.classId, d, slot.period))
          );
          if (otherDaysAvailable) continue;
        }

        // Shuffle teaching slots for variety
        const shuffledSlots = [...teachingSlots].sort(() => Math.random() - 0.5);

        for (const slot of shuffledSlots) {
          if (isSlotFree(req.teacherId, req.classId, day, slot.period)) {
            const entry: GeneratedEntry = {
              classId: req.classId,
              className: req.className,
              subjectId: req.subjectId,
              subjectName: req.subjectName,
              subjectCode: req.subjectCode,
              teacherId: req.teacherId,
              teacherName: req.teacherName,
              dayOfWeek: day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              period: slot.period,
            };

            entries.push(entry);
            occupySlot(req.teacherId, req.classId, day, slot.period);
            dayUsage.set(day, (dayUsage.get(day) || 0) + 1);
            assigned++;
            placed = true;
            break;
          }
        }

        if (placed) break;
      }

      if (!placed) {
        warnings.push({
          type: 'unassigned_periods',
          message: `Could not assign all periods for ${req.subjectName} in ${req.className}`,
          details: `Needed ${req.periodsPerWeek} periods/week, only assigned ${assigned + lockedEntries.filter(
            e => e.classId === req.classId && e.subjectId === req.subjectId
          ).length}. Teacher ${req.teacherName} may have too many conflicts.`,
        });
      }
    }
  }

  // Sort entries for clean output
  entries.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return a.className.localeCompare(b.className);
  });

  return {
    entries: entries.filter(e => !e.isLocked), // exclude pre-locked from new results
    warnings,
    success: warnings.length === 0,
  };
}
