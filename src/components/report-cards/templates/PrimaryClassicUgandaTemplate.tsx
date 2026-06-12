import { ReportData, SignatureRenderer, StampOverlay } from './shared';

/**
 * Primary Template 1 – Classic Uganda Style
 * Replicates the traditional Uganda primary school report card layout
 * (BOT / MID-TERM / END-OF-TERM exam tables, conduct, comments, grading key).
 *
 * Dynamic data only — nothing about the sample school is hardcoded.
 */
const PrimaryClassicUgandaTemplate = ({ data }: { data: ReportData }) => {
  const { student, school, term, subjects, summary, gradingScale, signatures, stampUrl, stampConfig } = data;

  const border = '1px solid #000';
  const cell: React.CSSProperties = { border, padding: '2px 5px', fontSize: '9.5px', verticalAlign: 'middle' };
  const cellC: React.CSSProperties = { ...cell, textAlign: 'center' };
  const cellB: React.CSSProperties = { ...cell, fontWeight: 'bold' };
  const cellBC: React.CSSProperties = { ...cellC, fontWeight: 'bold' };
  const sectionBar: React.CSSProperties = {
    textAlign: 'center', fontWeight: 'bold', fontSize: '10.5px',
    textTransform: 'uppercase', padding: '3px 0', margin: '4px 0 2px',
    letterSpacing: '0.6px', border, background: '#fff',
  };

  // Build a lookup by uppercased subject name
  const byName = new Map(subjects.map(s => [s.name?.toUpperCase()?.trim(), s]));
  const get = (...aliases: string[]) => {
    for (const a of aliases) {
      const s = byName.get(a.toUpperCase());
      if (s) return s;
    }
    return undefined;
  };

  // Columns shown in BOT / MID-TERM
  const shortCols: { label: string; aliases: string[] }[] = [
    { label: 'ENG', aliases: ['ENGLISH', 'ENG'] },
    { label: 'MTC', aliases: ['MATHEMATICS', 'MATH', 'MTC', 'MATHS'] },
    { label: 'SCI', aliases: ['SCIENCE', 'INTEGRATED SCIENCE', 'SCI'] },
    { label: 'SST', aliases: ['SOCIAL STUDIES', 'SST'] },
    { label: 'ICT', aliases: ['ICT', 'COMPUTER STUDIES', 'COMPUTER'] },
  ];

  // End-of-term subject rows (use real subject list, fallback to standard 5)
  const eotSubjects = subjects.length > 0 ? subjects : [];

  // Achievement remark mapping requested
  const remarkFor = (score: number | null | undefined) => {
    if (score === null || score === undefined || isNaN(Number(score))) return '';
    const v = Number(score);
    if (v >= 80) return 'Outstanding';
    if (v >= 45) return 'Moderate';
    return 'Basic';
  };

  // Division by aggregates (Uganda primary): I (4-12), II (13-23), III (24-29), IV (30-34), U (35+)
  const aggregates = subjects.reduce((sum, s) => sum + (Number.isFinite(s.identifier) ? s.identifier : 0), 0);
  const totalMarks = subjects.reduce((sum, s) => sum + (s.total100 ?? s.exam80 ?? 0), 0);
  const validCount = subjects.filter(s => (s.total100 ?? s.exam80) !== null && (s.total100 ?? s.exam80) !== undefined).length;
  const avgMarks = validCount > 0 ? totalMarks / validCount : 0;

  const division = (() => {
    if (aggregates === 0) return '—';
    if (aggregates <= 12) return 'I';
    if (aggregates <= 23) return 'II';
    if (aggregates <= 29) return 'III';
    if (aggregates <= 34) return 'IV';
    return 'U';
  })();

  return (
    <div
      className="bg-white text-black mx-auto"
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        color: '#000',
        fontSize: '10.5px',
        maxWidth: '210mm',
        minHeight: '297mm',
        padding: '8mm',
        position: 'relative',
        border: '2px dashed #000',
        boxSizing: 'border-box',
      }}
    >
      {/* Faint watermark logo */}
      {school.logoUrl && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 0,
          }}
        >
          <img
            src={school.logoUrl}
            alt=""
            style={{ width: '55%', maxWidth: '380px', opacity: 0.06, objectFit: 'contain' }}
          />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <StampOverlay stampUrl={stampUrl} stampConfig={stampConfig} />

        {/* ===== HEADER ===== */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ width: '90px', flexShrink: 0, textAlign: 'center' }}>
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', border: '1px solid #999', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#999' }}>Logo</div>
            )}
          </div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
              {school.name}
            </h1>
            {school.address && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>Location: {school.address}</p>
            )}
            {school.poBox && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>{school.poBox}</p>
            )}
            {school.phone && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>TEL: {school.phone}</p>
            )}
            {school.email && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>Email: {school.email}</p>
            )}
          </div>

          <div style={{ width: '90px', flexShrink: 0, textAlign: 'center' }}>
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="Student" style={{ width: '80px', height: '90px', objectFit: 'cover', border }} />
            ) : (
              <div style={{ width: '80px', height: '90px', border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Student<br />Photo
              </div>
            )}
          </div>
        </div>

        {/* ===== TITLE BAR ===== */}
        <div style={{ ...sectionBar, border, marginTop: '8px' }}>
          Learner&apos;s Assessment Report Card — {term.name} {term.year}
        </div>

        {/* ===== LEARNER INFORMATION ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
          <tbody>
            <tr>
              <td style={cellB}>NAME</td>
              <td style={cell} colSpan={3}>{student.name?.toUpperCase() || '—'}</td>
              <td style={cellB}>STREAM</td>
              <td style={cell}>{student.stream || '—'}</td>
              <td style={cellB}>HOUSE</td>
              <td style={cell}>{student.house || '—'}</td>
            </tr>
            <tr>
              <td style={cellB}>SECTION</td>
              <td style={cell}>{student.section || '—'}</td>
              <td style={cellB}>AGE</td>
              <td style={cell}>{student.age || '—'}</td>
              <td style={cellB}>SEX</td>
              <td style={cell}>{student.gender ? student.gender.charAt(0).toUpperCase() : '—'}</td>
              <td style={cellB}>PAY CODE</td>
              <td style={cell}>{(student as any).payCode || '—'}</td>
            </tr>
            <tr>
              <td style={cellB}>LIN No.</td>
              <td style={cell}>{student.admissionNo || '—'}</td>
              <td style={cellB}>CLASS</td>
              <td style={cell} colSpan={5}>{student.class || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* ===== BEGINNING OF TERM ===== */}
        <p style={sectionBar}>Beginning of Term Exams</p>
        <ExamTable
          cols={shortCols}
          get={get}
          markKey="a1"
          totalLabel="TOTAL MARKS"
        />

        {/* ===== MID-TERM ===== */}
        <p style={sectionBar}>Mid-Term Exams</p>
        <ExamTable
          cols={shortCols}
          get={get}
          markKey="a2"
          totalLabel="TOTAL MARKS"
        />

        {/* ===== END OF TERM ===== */}
        <p style={sectionBar}>End of Term Exams</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <td style={cellBC}>SUBJECTS</td>
              <td style={cellBC}>FULL MARKS</td>
              <td style={cellBC}>MARKS GOT</td>
              <td style={cellBC}>GRADE</td>
              <td style={cellBC}>REMARKS</td>
              <td style={cellBC}>INITIALS</td>
            </tr>
          </thead>
          <tbody>
            {eotSubjects.map((s, i) => {
              const got = s.total100 ?? s.exam80 ?? null;
              return (
                <tr key={i}>
                  <td style={cellB}>{s.name?.toUpperCase()}</td>
                  <td style={cellC}>100</td>
                  <td style={cellC}>{got !== null ? Math.round(got) : ''}</td>
                  <td style={cellC}>{s.grade || ''}</td>
                  <td style={cellC}>{s.remark || remarkFor(got)}</td>
                  <td style={cellC}>{s.teacherInitials || ''}</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 'bold' }}>
              <td style={cellB}>TOTAL MARKS: {totalMarks ? Math.round(totalMarks) : ''}</td>
              <td style={cellC} colSpan={2}>AVERAGE: {avgMarks ? avgMarks.toFixed(1) : ''}</td>
              <td style={cellC} colSpan={2}>AGGREGATES: {aggregates || ''}</td>
              <td style={cellC}>DIVISION: {division}</td>
            </tr>
          </tbody>
        </table>

        {/* ===== CONDUCT & CO-CURRICULAR ===== */}
        <div style={{ border, padding: '4px 6px', marginTop: '6px', fontSize: '10px' }}>
          <div><strong>Learner&apos;s Conduct & Behaviour:</strong> {(summary as any).conduct || '—'}</div>
          <div><strong>Co-curricular Activities:</strong> {(summary as any).coCurricular || '—'}</div>
        </div>

        {/* ===== COMMENTS + SIGNATURES ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
          <tbody>
            <tr>
              <td style={{ ...cellB, width: '28%' }}>Class Teacher&apos;s final comment:</td>
              <td style={cell}>{summary.classTeacherComment || '—'}</td>
              <td style={{ ...cellC, width: '28%' }}>
                {signatures?.classTeacher && (
                  <div style={{ marginBottom: '2px' }}><SignatureRenderer sig={signatures.classTeacher} /></div>
                )}
                <div style={{ fontWeight: 'bold' }}>{summary.classTeacherName || ''}</div>
                <div style={{ fontStyle: 'italic', fontSize: '9px' }}>Class Teacher</div>
              </td>
            </tr>
            <tr>
              <td style={cellB}>Head Teacher&apos;s final comment:</td>
              <td style={cell}>{summary.headTeacherComment || '—'}</td>
              <td style={cellC}>
                {signatures?.headTeacher && (
                  <div style={{ marginBottom: '2px' }}><SignatureRenderer sig={signatures.headTeacher} /></div>
                )}
                <div style={{ fontWeight: 'bold' }}>{(summary as any).headTeacherName || ''}</div>
                <div style={{ fontStyle: 'italic', fontSize: '9px' }}>Head Teacher</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== TERM DATES ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
          <tbody>
            <tr>
              <td style={cellB}>Next Term Begins On:</td>
              <td style={cell}>{term.nextTermStart || '—'}</td>
              <td style={cellB}>End On:</td>
              <td style={cell}>{term.endDate || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* ===== GRADING SYSTEM ===== */}
        <p style={sectionBar}>School Grading System</p>
        {gradingScale.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={cellBC}>GRADE</td>
                {gradingScale.map((g, i) => (
                  <td key={i} style={cellBC}>{g.grade}</td>
                ))}
              </tr>
              <tr>
                <td style={cellBC}>MARKS</td>
                {gradingScale.map((g, i) => (
                  <td key={i} style={cellC}>{g.maxScore}–{g.minScore}</td>
                ))}
              </tr>
            </tbody>
          </table>
        )}

        {/* ===== FOOTER MOTTO ===== */}
        {(school.footerMotto || school.motto) && (
          <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', marginTop: '8px', fontSize: '11px' }}>
            “{school.footerMotto || school.motto}”
          </p>
        )}
      </div>
    </div>
  );
};

/* ---------- helpers ---------- */

const ExamTable = ({
  cols, get, markKey, totalLabel,
}: {
  cols: { label: string; aliases: string[] }[];
  get: (...aliases: string[]) => any;
  markKey: 'a1' | 'a2' | 'a3';
  totalLabel: string;
}) => {
  const border = '1px solid #000';
  const cell: React.CSSProperties = { border, padding: '3px 6px', fontSize: '10px', textAlign: 'center' };
  const cellB: React.CSSProperties = { ...cell, fontWeight: 'bold' };

  let total = 0;
  let count = 0;
  let agg = 0;
  const marks = cols.map(c => {
    const s = get(...c.aliases);
    const m = s?.[markKey] ?? null;
    if (m !== null && m !== undefined) { total += Number(m); count++; }
    agg += s?.identifier || 0;
    return { mark: m, grade: s?.grade ?? '' };
  });
  const avg = count > 0 ? total / count : 0;
  const division = (() => {
    if (!agg) return '';
    if (agg <= 12) return 'I';
    if (agg <= 23) return 'II';
    if (agg <= 29) return 'III';
    if (agg <= 34) return 'IV';
    return 'U';
  })();

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td style={cellB}>SUBJECTS</td>
          {cols.map(c => <td key={c.label} style={cellB}>{c.label}</td>)}
        </tr>
        <tr>
          <td style={cellB}>MARKS</td>
          {marks.map((m, i) => <td key={i} style={cell}>{m.mark !== null && m.mark !== undefined ? Math.round(Number(m.mark)) : ''}</td>)}
        </tr>
        <tr>
          <td style={cellB}>GRADE</td>
          {marks.map((m, i) => <td key={i} style={cell}>{m.grade}</td>)}
        </tr>
        <tr style={{ fontWeight: 'bold' }}>
          <td style={cellB}>{totalLabel}: {total ? Math.round(total) : ''}</td>
          <td style={cell} colSpan={Math.max(1, Math.floor(cols.length / 3))}>AVERAGE: {avg ? avg.toFixed(0) : ''}</td>
          <td style={cell} colSpan={Math.max(1, Math.floor(cols.length / 3))}>AGGREGATES: {agg || ''}</td>
          <td style={cell} colSpan={Math.max(1, cols.length - 2 * Math.max(1, Math.floor(cols.length / 3)))}>DIVISION: {division}</td>
        </tr>
      </tbody>
    </table>
  );
};

export default PrimaryClassicUgandaTemplate;
