import { ReportData, SignatureRenderer, cellStyle, StampOverlay } from './shared';

const PrimaryTemplate = ({ data }: { data: ReportData }) => {
  const { student, school, term, subjects, summary, gradingScale, signatures, stampUrl, stampConfig } = data;

  const thinBorder = '1px solid #333';
  const cell: React.CSSProperties = { border: thinBorder, padding: '3px 6px', fontSize: '10.5px' };
  const cellCenter: React.CSSProperties = { ...cell, textAlign: 'center' };
  const cellBold: React.CSSProperties = { ...cell, fontWeight: 'bold' };
  const sectionTitle: React.CSSProperties = {
    fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' as const,
    textDecoration: 'underline', margin: '8px 0 4px', letterSpacing: '0.5px',
  };

  // Map subjects by name for the primary layout
  const subjectMap = new Map(subjects.map(s => [s.name?.toUpperCase()?.trim(), s]));
  const getSubjectMark = (name: string) => {
    const s = subjectMap.get(name.toUpperCase());
    return s?.total100?.toFixed(0) ?? s?.exam80?.toFixed(0) ?? '';
  };
  const getSubjectGrade = (name: string) => {
    const s = subjectMap.get(name.toUpperCase());
    return s?.grade ?? '';
  };

  // Primary subjects in order
  const primarySubjects = ['ENGLISH', 'MATHEMATICS', 'SCIENCE', 'SST', 'R.E', 'ICT'];
  const botMidCols = ['ENG', 'MTC', 'SCI', 'SST', 'RE', 'ICT'];

  // Calculate aggregates & division
  const validTotals = subjects.filter(s => s.total100 !== null).map(s => s.total100 as number);
  const totalMarks = validTotals.reduce((a, b) => a + b, 0);
  const avgMarks = validTotals.length > 0 ? totalMarks / validTotals.length : 0;

  // Division calculation (primary style)
  const getDivision = (avg: number) => {
    if (avg >= 80) return 'I';
    if (avg >= 65) return 'II';
    if (avg >= 50) return 'III';
    if (avg >= 35) return 'IV';
    return 'U';
  };

  const overallAggregate = validTotals.length > 0 ? Math.round(avgMarks) : 0;
  const division = getDivision(avgMarks);

  return (
    <div
      className="bg-white text-black mx-auto"
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '11px',
        maxWidth: '210mm',
        padding: '8mm 10mm',
        position: 'relative',
        border: '1px solid #000',
      }}
    >
      {/* ============ SECTION 1: SCHOOL HEADER ============ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
        {/* LEFT: School Logo */}
        <div style={{ width: '80px', flexShrink: 0 }}>
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '70px', height: '70px', border: '1px solid #999', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#999', textAlign: 'center' }}>
              School<br />Logo
            </div>
          )}
        </div>

        {/* CENTER: School Info */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>
            {school.name}
          </h1>
          {school.address && <p style={{ fontSize: '10px', margin: '1px 0' }}>Location: {school.address}</p>}
          <p style={{ fontSize: '10px', margin: '1px 0' }}>P.O. Box: {school.address || '—'}</p>
          {school.phone && <p style={{ fontSize: '10px', margin: '1px 0' }}>TEL: {school.phone}</p>}
          {school.email && <p style={{ fontSize: '10px', margin: '1px 0' }}>Email: {school.email}</p>}
          {school.website && <p style={{ fontSize: '10px', margin: '1px 0' }}>Website: {school.website}</p>}
        </div>

        {/* RIGHT: Student Photo */}
        <div style={{ width: '80px', flexShrink: 0, textAlign: 'right' }}>
          {student.photoUrl ? (
            <img src={student.photoUrl} alt="Student" style={{ width: '70px', height: '85px', objectFit: 'cover', border: '1.5px solid #000' }} />
          ) : (
            <div style={{ width: '70px', height: '85px', border: '1.5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#999', textAlign: 'center' }}>
              Student<br />Photo
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', margin: '4px 0 8px', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '4px 0' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
          {term.name} — REPORT CARD {term.year}
        </h2>
      </div>

      {/* ============ SECTION 2: STUDENT INFORMATION TABLE ============ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <tbody>
          <tr>
            <td style={cellBold}>NAME</td>
            <td style={cell} colSpan={2}>{student.name?.toUpperCase()}</td>
            <td style={cellBold}>Age</td>
            <td style={cell}>{student.age || '—'}</td>
            <td style={cellBold}>PAY CODE</td>
            <td style={cell}>{student.admissionNo || '—'}</td>
          </tr>
          <tr>
            <td style={cellBold}>SECTION</td>
            <td style={cell} colSpan={2}>{student.section || '—'}</td>
            <td style={cellBold}>LIN No.</td>
            <td style={cell}>{student.admissionNo || '—'}</td>
            <td style={cellBold}>STREAM</td>
            <td style={cell}>{student.stream || '—'}</td>
          </tr>
          <tr>
            <td style={cellBold}>HOUSE</td>
            <td style={cell} colSpan={2}>{student.house || '—'}</td>
            <td style={cellBold}>CLASS</td>
            <td style={cell} colSpan={3}>{student.class || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* ============ SECTION 3: BEGINNING OF TERM EXAMINATION RESULTS ============ */}
      <p style={sectionTitle}>BEGINNING OF TERM — EXAMINATION RESULTS</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <thead>
          <tr>
            <td style={cellBold}>Subject</td>
            {botMidCols.map(col => <td key={col} style={cellCenter}><strong>{col}</strong></td>)}
            <td style={cellCenter}><strong>AGG</strong></td>
            <td style={cellCenter}><strong>DIV</strong></td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellBold}>Marks (100)</td>
            {botMidCols.map(col => {
              const fullName = col === 'ENG' ? 'ENGLISH' : col === 'MTC' ? 'MATHEMATICS' : col === 'SCI' ? 'SCIENCE' : col === 'RE' ? 'R.E' : col;
              const sub = subjectMap.get(fullName);
              return <td key={col} style={cellCenter}>{sub?.a1?.toFixed(0) ?? ''}</td>;
            })}
            <td style={cellCenter}></td>
            <td style={cellCenter}></td>
          </tr>
          <tr>
            <td style={cellBold}>Grade</td>
            {botMidCols.map(col => <td key={col} style={cellCenter}></td>)}
            <td style={cellCenter}></td>
            <td style={cellCenter}></td>
          </tr>
        </tbody>
      </table>

      {/* ============ SECTION 4: MID TERM EXAMINATION RESULTS ============ */}
      <p style={sectionTitle}>MID TERM — EXAMINATION RESULTS</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <thead>
          <tr>
            <td style={cellBold}>Subject</td>
            {botMidCols.map(col => <td key={col} style={cellCenter}><strong>{col}</strong></td>)}
            <td style={cellCenter}><strong>DIV</strong></td>
            <td style={cellCenter}><strong>TOTAL</strong></td>
            <td style={cellCenter}><strong>AGG</strong></td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellBold}>Marks (100)</td>
            {botMidCols.map(col => {
              const fullName = col === 'ENG' ? 'ENGLISH' : col === 'MTC' ? 'MATHEMATICS' : col === 'SCI' ? 'SCIENCE' : col === 'RE' ? 'R.E' : col;
              const sub = subjectMap.get(fullName);
              return <td key={col} style={cellCenter}>{sub?.a2?.toFixed(0) ?? ''}</td>;
            })}
            <td style={cellCenter}></td>
            <td style={cellCenter}></td>
            <td style={cellCenter}></td>
          </tr>
          <tr>
            <td style={cellBold}>Grade</td>
            {botMidCols.map(col => <td key={col} style={cellCenter}></td>)}
            <td style={cellCenter}></td>
            <td style={cellCenter}></td>
            <td style={cellCenter}></td>
          </tr>
        </tbody>
      </table>

      {/* ============ SECTION 5: END OF TERM EXAMINATION RESULTS ============ */}
      <p style={sectionTitle}>END OF TERM — EXAMINATION RESULTS</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <td style={{ ...cellBold, width: '25%' }}>SUBJECT</td>
            <td style={{ ...cellCenter, width: '12%' }}><strong>FULL MARKS</strong></td>
            <td style={{ ...cellCenter, width: '15%' }}><strong>MARKS OBTAINED</strong></td>
            <td style={{ ...cellCenter, width: '12%' }}><strong>AGG</strong></td>
            <td style={{ ...cellBold, width: '22%' }}>REMARKS</td>
            <td style={{ ...cellCenter, width: '14%' }}><strong>INITIALS</strong></td>
          </tr>
        </thead>
        <tbody>
          {primarySubjects.map((subName, idx) => {
            const sub = subjectMap.get(subName);
            return (
              <tr key={idx}>
                <td style={cellBold}>{subName}</td>
                <td style={cellCenter}>100</td>
                <td style={cellCenter}>{sub?.total100?.toFixed(0) ?? sub?.exam80?.toFixed(0) ?? ''}</td>
                <td style={cellCenter}>{sub?.grade ?? ''}</td>
                <td style={cell}>{sub?.remark ?? ''}</td>
                <td style={cellCenter}>{sub?.teacherInitials ?? ''}</td>
              </tr>
            );
          })}

          {/* TOTAL row */}
          <tr style={{ fontWeight: 'bold' }}>
            <td style={cellBold}>TOTAL</td>
            <td style={cellCenter}>{primarySubjects.length * 100}</td>
            <td style={cellCenter}>{totalMarks || ''}</td>
            <td style={cellCenter}></td>
            <td style={{ ...cell, fontSize: '9px' }}>
              <span style={{ marginRight: '20px' }}>Overall Agg: <strong>{overallAggregate}</strong></span>
              <span>Class Teacher: <strong>{summary.classTeacherName || '—'}</strong></span>
            </td>
            <td style={cellCenter}></td>
          </tr>

          {/* AGG / AVE / DW row */}
          <tr>
            <td colSpan={3} style={{ border: 'none' }}></td>
            <td colSpan={1} style={cellCenter}></td>
            <td style={{ ...cell, textAlign: 'right', fontSize: '9.5px' }}>
              <strong>AGG:</strong> {overallAggregate} &nbsp;&nbsp;
              <strong>AVE:</strong> {avgMarks > 0 ? avgMarks.toFixed(1) : ''} &nbsp;&nbsp;
              <strong>DW:</strong> {division}
            </td>
            <td style={cellCenter}></td>
          </tr>
        </tbody>
      </table>

      {/* ============ SECTION 6: CONDUCT AND COMMENTS ============ */}
      <div style={{ border: thinBorder, marginBottom: '6px', padding: '6px 8px' }}>
        {/* Conduct & Co-curricular */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '10.5px' }}>
          <div style={{ flex: 1 }}>
            <strong>Conduct & Behaviour:</strong> ___________________________
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <strong>Co-curricular Activities:</strong> ___________________________
          </div>
        </div>

        {/* Class Teacher Comment + Signature */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px', fontSize: '10.5px' }}>
          <div style={{ flex: 1 }}>
            <strong>Class Teacher's Comment:</strong><br />
            <span style={{ fontStyle: 'italic' }}>{summary.classTeacherComment || '—'}</span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '140px', paddingLeft: '10px' }}>
            <strong style={{ fontSize: '9px' }}>Signature:</strong>
            {signatures?.classTeacher && <div style={{ marginTop: '2px' }}><SignatureRenderer sig={signatures.classTeacher} /></div>}
            <div style={{ borderBottom: '1px solid #333', marginTop: '4px', width: '120px' }} />
          </div>
        </div>

        {/* Head Teacher Comment + Signature */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '10.5px', position: 'relative' }}>
          <div style={{ flex: 1 }}>
            <strong>Head Teacher's Comment:</strong><br />
            <span style={{ fontStyle: 'italic' }}>{summary.headTeacherComment || '—'}</span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '140px', paddingLeft: '10px', position: 'relative' }}>
            <strong style={{ fontSize: '9px' }}>Signature:</strong>
            {signatures?.headTeacher && <div style={{ marginTop: '2px' }}><SignatureRenderer sig={signatures.headTeacher} /></div>}
            <div style={{ borderBottom: '1px solid #333', marginTop: '4px', width: '120px' }} />
            {/* Stamp via global overlay */}
          </div>
        </div>
      </div>

      {/* ============ SECTION 7: TERM INFORMATION ============ */}
      <div style={{ display: 'flex', gap: '20px', fontSize: '10.5px', marginBottom: '6px', border: thinBorder, padding: '4px 8px' }}>
        <span><strong>Next Term Begins On:</strong> {term.nextTermStart || '_______________'}</span>
        <span><strong>End On:</strong> {term.endDate || '_______________'}</span>
      </div>

      {/* Requirements */}
      {term.otherRequirements && (
        <div style={{ fontSize: '10px', marginBottom: '6px', border: thinBorder, padding: '4px 8px' }}>
          <strong>Requirements:</strong> {term.otherRequirements}
        </div>
      )}

      {/* ============ SECTION 8: GRADE AND MARKS KEY ============ */}
      {gradingScale.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '4px' }}>
          <tbody>
            <tr>
              <td style={cellBold}>GRADE</td>
              {gradingScale.map((g, i) => (
                <td key={i} style={cellCenter}><strong>{g.grade}</strong></td>
              ))}
            </tr>
            <tr>
              <td style={cellBold}>MARKS</td>
              {gradingScale.map((g, i) => (
                <td key={i} style={cellCenter}>{g.maxScore} – {g.minScore}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {/* Footer Motto */}
      {school.footerMotto && (
        <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', color: '#8B0000', marginTop: '6px', fontSize: '10px' }}>
          "{school.footerMotto}"
        </p>
      )}
    </div>
  );
};

export default PrimaryTemplate;
