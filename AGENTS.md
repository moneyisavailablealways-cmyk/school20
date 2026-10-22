# Attendance architecture
- Use one shared weekly attendance grid for staff marking and personal views, retaining legacy daily/report workflows in separate tabs to avoid duplicated weekly logic.
- Derive working days from the school/year timetable configuration and validate weekly writes transactionally in authenticated database functions, because calendar and tenant rules must not rely on browser controls.
- Keep student sessions and teacher leave/time metadata in their existing separate attendance models, because they have different uniqueness and approval rules.