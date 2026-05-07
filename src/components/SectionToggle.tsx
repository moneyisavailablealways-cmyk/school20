import { Baby, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchoolSection } from '@/hooks/useSchoolSection';

interface Props {
  className?: string;
}

/**
 * Nursery / Primary section toggle.
 * Renders only for Primary schools that have the nursery section enabled.
 */
export function SectionToggle({ className }: Props) {
  const { section, setSection, nurseryEnabled, isPrimarySchool } = useSchoolSection();

  if (!isPrimarySchool || !nurseryEnabled) return null;

  return (
    <div
      role="tablist"
      aria-label="School section"
      className={cn(
        'inline-flex items-center rounded-full border bg-muted/40 p-0.5 text-xs font-medium',
        className,
      )}
    >
      <button
        role="tab"
        aria-selected={section === 'nursery'}
        onClick={() => setSection('nursery')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors',
          section === 'nursery'
            ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200 shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Baby className="h-3.5 w-3.5" />
        Nursery
      </button>
      <button
        role="tab"
        aria-selected={section === 'primary'}
        onClick={() => setSection('primary')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors',
          section === 'primary'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Primary
      </button>
    </div>
  );
}
