import { useRef } from 'react';

interface ReportCardPreviewProps {
  data: any;
}

const ReportCardPreview = ({ data }: ReportCardPreviewProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const student = data.student || {};
  const school = data.school || {};
  const term = data.term || {};
  const subjects = data.subjects || [];
  const summary = data.summary || {};
  const gradingScale = data.gradingScale || [];
  const attendance = data.attendance || {};
  const signatures = data.signatures || {};
  const stampUrl = data.stampUrl || '';
  const fees = data.fees || {};

  // Calculate averages for bottom row
  const calcAvg = (key: string) => {
    const vals = subjects.filter((s: any) => s[key] !== null && s[key] !== undefined);
    if (vals.length === 0) return '';
    return (vals.reduce((sum: number, s: any) => sum + Number(s[key]), 0) / vals.length).toFixed(1);
  };

  const renderSignature = (sig: any) => {
    if (!sig) return null;
    if (sig.signatureType === 'typed') {
      return (
        <span style={{ fontFamily: sig.fontFamily || 'cursive', fontSize: '18px', fontWeight: 'bold' }}>
          {sig.signatureData}
        </span>
      );
    }
    return <img src={sig.signatureData} alt="Signature" style={{ height: '40px', objectFit: 'contain' }} />;
  };

  return (
    <div
      ref={reportRef}
      className="bg-white text-black mx-auto"
      style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11px', maxWidth: '210mm', padding: '8mm 10mm' }}
    >
      {/* ===== HEADER ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px double #000', paddingBottom: '8px', marginBottom: '6px' }}>
        {/* Left: School logo */}
        <div style={{ width: '80px', flexShrink: 0 }}>
          {school.logoUrl && (
            <img src={school.logoUrl} alt="School Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
          )}
        </div>

        {/* Center: School info */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>
            {school.name}
          </h1>
          {school.motto && (
            <p style={{ fontSize: '11px', fontStyle: 'italic', margin: '2px 0', color: '#333' }}>
              <em>"{school.motto}"</em>
            </p>
          )}
          <p style={{ fontSize: '10px', margin: '1px 0' }}>{school.address}</p>
          <p style={{ fontSize: '10px', margin: '1px 0' }}>
            Tel: {school.phone} | Email: {school.email}
            {school.website ? ` | ${school.website}` : ''}
          </p>
        </div>

        {/* Right: School badge or student photo */}
        <div style={{ width: '80px', flexShrink: 0, textAlign: 'right' }}>
          {school.badge ? (
            <img src={school.badge} alt="School Badge" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
          ) : student.photoUrl ? (
            <img src={student.photoUrl} alt="Student" style={{ width: '65px', height: '80px', objectFit: 'cover', border: '1px solid #999' }} />
          ) : null}
        </div>
      </div>

      {/* ===== REPORT TITLE ===== */}
      <div style={{ textAlign: 'center', margin: '6px 0', padding: '4px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
          {term.name} Report Card — {term.year}
        </h2>
      </div>

      {/* ===== STUDENT INFORMATION ===== */}
      <div style={{ border: '1px solid #999', marginBottom: '6px' }}>
        <div style={{ backgroundColor: '#e8e8e8', padding: '3px 6px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #999' }}>
          Student Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: student.photoUrl && !school.badge ? '1fr' : '1fr auto', gap: '0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '10.5px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
              <InfoRow label="Full Name" value={student.name?.toUpperCase()} />
              <InfoRow label="Admission No." value={student.admissionNo} />
              <InfoRow label="Gender" value={student.gender?.toUpperCase()} />
              <InfoRow label="Age" value={student.age ? `${student.age} years` : ''} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
              <InfoRow label="Class" value={student.class} />
              <InfoRow label="Stream / Section" value={[student.stream, student.section].filter(Boolean).join(' — ')} />
              <InfoRow label="House" value={student.house} />
              <InfoRow label="Level" value={student.level} />
            </div>
          </div>
          {/* Student photo on right if badge is in header */}
          {student.photoUrl && school.badge && (
            <div style={{ padding: '4px', borderLeft: '1px solid #999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={student.photoUrl} alt="Student" style={{ width: '60px', height: '75px', objectFit: 'cover', border: '1px solid #ccc' }} />
            </div>
          )}
        </div>
      </div>

      {/* ===== PERFORMANCE TABLE ===== */}
      <div style={{ border: '1px solid #999', marginBottom: '6px' }}>
        <div style={{ backgroundColor: '#e8e8e8', padding: '3px 6px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #999', textAlign: 'center' }}>
          Performance Records
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <Th>Code</Th>
              <Th align="left" wide>Subject</Th>
              <Th>A1</Th>
              <Th>A2</Th>
              <Th>A3</Th>
              <Th>AVG</Th>
              <Th>20%</Th>
              <Th>80%</Th>
              <Th>100%</Th>
              <Th>ID</Th>
              <Th>Grade</Th>
              <Th align="left" wide>Remarks / Descriptor</Th>
              <Th>TR</Th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub: any, idx: number) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <Td bold>{sub.code}</Td>
                <Td align="left" bold>{sub.name}</Td>
                <Td>{sub.a1?.toFixed(1) ?? ''}</Td>
                <Td>{sub.a2?.toFixed(1) ?? ''}</Td>
                <Td>{sub.a3?.toFixed(1) ?? ''}</Td>
                <Td>{sub.avg?.toFixed(1) ?? ''}</Td>
                <Td>{sub.ca20?.toFixed(1) ?? ''}</Td>
                <Td>{sub.exam80?.toFixed(1) ?? ''}</Td>
                <Td bold>{sub.total100?.toFixed(1) ?? ''}</Td>
                <Td>{sub.identifier}</Td>
                <Td bold>{sub.grade}</Td>
                <Td align="left">{sub.remark}</Td>
                <Td>{sub.teacherInitials}</Td>
              </tr>
            ))}
            {/* Average Row */}
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td colSpan={5} style={{ ...cellStyle, textAlign: 'right', paddingRight: '6px' }}>AVERAGE:</td>
              <Td>{calcAvg('avg')}</Td>
              <Td>{calcAvg('ca20')}</Td>
              <Td>{calcAvg('exam80')}</Td>
              <Td>{calcAvg('total100')}</Td>
              <td colSpan={4} style={cellStyle}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== SUMMARY ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', border: '1px solid #999', marginBottom: '6px' }}>
        <SummaryBox label="Overall Average" value={`${summary.overallAvg || 0}%`} />
        <SummaryBox label="Overall Grade" value={summary.overallGrade || 'N/A'} />
        <SummaryBox label="Identifier" value={summary.overallIdentifier || 'N/A'} />
        <SummaryBox label="Achievement Level" value={summary.overallAchievement || 'N/A'} last />
      </div>

      {/* ===== ATTENDANCE SUMMARY ===== */}
      {attendance.totalDays > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', border: '1px solid #999', marginBottom: '6px', fontSize: '10px' }}>
          <AttBox label="Total Days" value={attendance.totalDays} />
          <AttBox label="Present" value={attendance.present} />
          <AttBox label="Absent" value={attendance.absent} />
          <AttBox label="Late" value={attendance.late} />
          <AttBox label="Attendance %" value={`${attendance.percentage}%`} last />
        </div>
      )}

      {/* ===== GRADING SCALE ===== */}
      {gradingScale.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '6px' }}>
          <tbody>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <td style={{ ...cellStyle, fontWeight: 'bold', width: '60px' }}>GRADE</td>
              {gradingScale.map((g: any, i: number) => (
                <td key={i} style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{g.grade}</td>
              ))}
            </tr>
            <tr>
              <td style={{ ...cellStyle, fontWeight: 'bold' }}>SCORES</td>
              {gradingScale.map((g: any, i: number) => (
                <td key={i} style={{ ...cellStyle, textAlign: 'center' }}>{g.maxScore}–{g.minScore}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {/* ===== COMMENTS ===== */}
      <div style={{ border: '1px solid #999', marginBottom: '6px' }}>
        <div style={{ borderBottom: '1px solid #ccc', padding: '5px 8px', fontSize: '10.5px' }}>
          <strong>Class Teacher's Comment:</strong>{' '}
          <span style={{ fontStyle: 'italic' }}>{summary.classTeacherComment || 'No comment'}</span>
        </div>
        <div style={{ padding: '5px 8px', fontSize: '10.5px' }}>
          <strong>Head Teacher's Comment:</strong>{' '}
          <span style={{ fontStyle: 'italic' }}>{summary.headTeacherComment || 'No comment'}</span>
        </div>
      </div>

      {/* ===== SIGNATURES & STAMP ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '6px', fontSize: '10px' }}>
        {/* Class Teacher Signature */}
        <div style={{ textAlign: 'center', borderTop: '1px dashed #999', paddingTop: '4px' }}>
          {signatures.classTeacher ? (
            <div style={{ marginBottom: '4px' }}>{renderSignature(signatures.classTeacher)}</div>
          ) : (
            <div style={{ height: '40px' }} />
          )}
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10px' }}>
            {signatures.classTeacher?.name || summary.classTeacherName || 'Class Teacher'}
          </p>
          <p style={{ margin: 0, fontSize: '9px', color: '#666' }}>Class Teacher</p>
        </div>

        {/* School Stamp */}
        <div style={{ textAlign: 'center' }}>
          {stampUrl ? (
            <img src={stampUrl} alt="School Stamp" style={{ height: '60px', objectFit: 'contain', opacity: 0.8 }} />
          ) : (
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '9px', color: '#aaa', fontStyle: 'italic' }}>[School Stamp]</span>
            </div>
          )}
        </div>

        {/* Head Teacher Signature */}
        <div style={{ textAlign: 'center', borderTop: '1px dashed #999', paddingTop: '4px' }}>
          {signatures.headTeacher ? (
            <div style={{ marginBottom: '4px' }}>{renderSignature(signatures.headTeacher)}</div>
          ) : (
            <div style={{ height: '40px' }} />
          )}
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10px' }}>
            {signatures.headTeacher?.name || 'Head Teacher'}
          </p>
          <p style={{ margin: 0, fontSize: '9px', color: '#666' }}>Head Teacher / Principal</p>
        </div>
      </div>

      {/* ===== KEY TO TERMS ===== */}
      <div style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '9px', marginBottom: '6px', backgroundColor: '#fafafa' }}>
        <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>Key to Terms Used:</p>
        <p style={{ margin: '1px 0' }}><strong>A1, A2, A3</strong> — Continuous Assessment scores &nbsp;|&nbsp; <strong>20%</strong> — CA contribution &nbsp;|&nbsp; <strong>80%</strong> — End of term exam contribution</p>
        <p style={{ margin: '1px 0' }}><strong>ID 1 (Basic):</strong> 0.9–1.49 — Few LOs achieved &nbsp;|&nbsp; <strong>ID 2 (Moderate):</strong> 1.5–2.49 — Many LOs achieved &nbsp;|&nbsp; <strong>ID 3 (Outstanding):</strong> 2.5–3.0 — Most/all LOs achieved</p>
      </div>

      {/* ===== FOOTER ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', border: '1px solid #999', fontSize: '9.5px' }}>
        <FooterCell label="TERM ENDED ON" value={term.endDate || '—'} />
        <FooterCell label="NEXT TERM BEGINS" value={term.nextTermStart || '—'} />
        <FooterCell label="FEES BALANCE" value={term.feesBalance || '—'} />
        <FooterCell label="FEES NEXT TERM" value={term.feesNextTerm || '—'} />
        <FooterCell label="OTHER REQUIREMENTS" value={term.otherRequirements || '—'} last />
      </div>

      {/* ===== FOOTER MOTTO ===== */}
      {school.footerMotto && (
        <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', color: '#8B0000', marginTop: '8px', fontSize: '11px' }}>
          "{school.footerMotto}"
        </p>
      )}

      {/* ===== PRINTED DATE ===== */}
      <p style={{ textAlign: 'right', fontSize: '8px', color: '#999', marginTop: '4px' }}>
        Printed on: {term.printedDate}
      </p>
    </div>
  );
};

// ——— Sub-components ———

const cellStyle: React.CSSProperties = {
  border: '1px solid #bbb',
  padding: '2px 4px',
};

const Th = ({ children, align = 'center', wide = false }: { children: React.ReactNode; align?: string; wide?: boolean }) => (
  <th style={{ ...cellStyle, textAlign: align as any, fontWeight: 'bold', fontSize: '9.5px', whiteSpace: 'nowrap', minWidth: wide ? '80px' : undefined }}>
    {children}
  </th>
);

const Td = ({ children, align = 'center', bold = false }: { children: React.ReactNode; align?: string; bold?: boolean }) => (
  <td style={{ ...cellStyle, textAlign: align as any, fontWeight: bold ? 'bold' : 'normal' }}>
    {children}
  </td>
);

const InfoRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <>
    <div style={{ padding: '2px 6px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>{label}:</div>
    <div style={{ padding: '2px 6px', borderBottom: '1px solid #eee' }}>{value || '—'}</div>
  </>
);

const SummaryBox = ({ label, value, last = false }: { label: string; value: string | number; last?: boolean }) => (
  <div style={{ textAlign: 'center', padding: '6px 4px', borderRight: last ? 'none' : '1px solid #999' }}>
    <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#555' }}>{label}</p>
    <p style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 'bold' }}>{value}</p>
  </div>
);

const AttBox = ({ label, value, last = false }: { label: string; value: string | number; last?: boolean }) => (
  <div style={{ textAlign: 'center', padding: '4px', borderRight: last ? 'none' : '1px solid #999' }}>
    <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', color: '#555' }}>{label}</p>
    <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 'bold' }}>{value}</p>
  </div>
);

const FooterCell = ({ label, value, last = false }: { label: string; value: string; last?: boolean }) => (
  <div style={{ padding: '4px 6px', borderRight: last ? 'none' : '1px solid #999' }}>
    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '9px' }}>{label}</p>
    <p style={{ margin: '2px 0 0' }}>{value}</p>
  </div>
);

export default ReportCardPreview;
