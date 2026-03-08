import { ReportData, SignatureRenderer, InfoRow, SummaryBox, AttendanceBox, FooterCell, cellStyle, Th, Td, calcAvg } from './shared';

const ClassicTemplate = ({ data }: { data: ReportData }) => {
  const { student, school, term, subjects, summary, gradingScale, attendance, signatures, stampUrl } = data;

  return (
    <div
      className="bg-white text-black mx-auto"
      style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11px', maxWidth: '210mm', padding: '8mm 10mm' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px double #000', paddingBottom: '8px', marginBottom: '6px' }}>
        <div style={{ width: '80px', flexShrink: 0 }}>
          {school.logoUrl && <img src={school.logoUrl} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />}
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, letterSpacing: '2px' }}>{school.name}</h1>
          {school.motto && <p style={{ fontSize: '11px', fontStyle: 'italic', margin: '2px 0', color: '#333' }}>"{school.motto}"</p>}
          <p style={{ fontSize: '10px', margin: '1px 0' }}>{school.address}</p>
          <p style={{ fontSize: '10px', margin: '1px 0' }}>Tel: {school.phone} | Email: {school.email}{school.website ? ` | ${school.website}` : ''}</p>
        </div>
        <div style={{ width: '80px', flexShrink: 0, textAlign: 'right' }}>
          {school.badge ? <img src={school.badge} alt="Badge" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
            : student.photoUrl ? <img src={student.photoUrl} alt="Student" style={{ width: '65px', height: '80px', objectFit: 'cover', border: '1px solid #999' }} /> : null}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', margin: '6px 0', padding: '5px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>{term.name} Report Card — {term.year}</h2>
      </div>

      {/* Student Info */}
      <div style={{ border: '1px solid #999', marginBottom: '6px' }}>
        <div style={{ backgroundColor: '#e8e8e8', padding: '3px 6px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #999' }}>Student Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: student.photoUrl && school.badge ? '1fr auto' : '1fr', gap: '0' }}>
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
          {student.photoUrl && school.badge && (
            <div style={{ padding: '4px', borderLeft: '1px solid #999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={student.photoUrl} alt="Student" style={{ width: '60px', height: '75px', objectFit: 'cover', border: '1px solid #ccc' }} />
            </div>
          )}
        </div>
      </div>

      {/* Performance Table */}
      <div style={{ border: '1px solid #999', marginBottom: '6px' }}>
        <div style={{ backgroundColor: '#e8e8e8', padding: '3px 6px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #999', textAlign: 'center' }}>Performance Records</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <Th>Code</Th><Th align="left" wide>Subject</Th><Th>A1</Th><Th>A2</Th><Th>A3</Th><Th>AVG</Th><Th>20%</Th><Th>80%</Th><Th>100%</Th><Th>ID</Th><Th>Grade</Th><Th align="left" wide>Remarks</Th><Th>TR</Th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <Td bold>{sub.code}</Td><Td align="left" bold>{sub.name}</Td>
                <Td>{sub.a1?.toFixed(1) ?? ''}</Td><Td>{sub.a2?.toFixed(1) ?? ''}</Td><Td>{sub.a3?.toFixed(1) ?? ''}</Td>
                <Td>{sub.avg?.toFixed(1) ?? ''}</Td><Td>{sub.ca20?.toFixed(1) ?? ''}</Td><Td>{sub.exam80?.toFixed(1) ?? ''}</Td>
                <Td bold>{sub.total100?.toFixed(1) ?? ''}</Td><Td>{sub.identifier}</Td><Td bold>{sub.grade}</Td>
                <Td align="left">{sub.remark}</Td><Td>{sub.teacherInitials}</Td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td colSpan={5} style={{ ...cellStyle, textAlign: 'right', paddingRight: '6px' }}>AVERAGE:</td>
              <Td>{calcAvg(subjects, 'avg')}</Td><Td>{calcAvg(subjects, 'ca20')}</Td><Td>{calcAvg(subjects, 'exam80')}</Td><Td>{calcAvg(subjects, 'total100')}</Td>
              <td colSpan={4} style={cellStyle}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', border: '1px solid #999', marginBottom: '6px' }}>
        <SummaryBox label="Overall Average" value={`${summary.overallAvg || 0}%`} />
        <SummaryBox label="Overall Grade" value={summary.overallGrade || 'N/A'} />
        <SummaryBox label="Identifier" value={summary.overallIdentifier || 'N/A'} />
        <SummaryBox label="Achievement Level" value={summary.overallAchievement || 'N/A'} last />
      </div>

      {/* Attendance */}
      {attendance?.totalDays > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', border: '1px solid #999', marginBottom: '6px', fontSize: '10px' }}>
          <AttendanceBox label="Total Days" value={attendance.totalDays} />
          <AttendanceBox label="Present" value={attendance.present} />
          <AttendanceBox label="Absent" value={attendance.absent} />
          <AttendanceBox label="Late" value={attendance.late} />
          <AttendanceBox label="Attendance %" value={`${attendance.percentage}%`} last />
        </div>
      )}

      {/* Grading Scale */}
      {gradingScale.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '6px' }}>
          <tbody>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <td style={{ ...cellStyle, fontWeight: 'bold', width: '60px' }}>GRADE</td>
              {gradingScale.map((g, i) => <td key={i} style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{g.grade}</td>)}
            </tr>
            <tr>
              <td style={{ ...cellStyle, fontWeight: 'bold' }}>SCORES</td>
              {gradingScale.map((g, i) => <td key={i} style={{ ...cellStyle, textAlign: 'center' }}>{g.maxScore}–{g.minScore}</td>)}
            </tr>
          </tbody>
        </table>
      )}

      {/* Comments */}
      <div style={{ border: '1px solid #999', marginBottom: '6px' }}>
        <div style={{ borderBottom: '1px solid #ccc', padding: '5px 8px', fontSize: '10.5px' }}>
          <strong>Class Teacher's Comment:</strong> <span style={{ fontStyle: 'italic' }}>{summary.classTeacherComment || 'No comment'}</span>
        </div>
        <div style={{ padding: '5px 8px', fontSize: '10.5px' }}>
          <strong>Head Teacher's Comment:</strong> <span style={{ fontStyle: 'italic' }}>{summary.headTeacherComment || 'No comment'}</span>
        </div>
      </div>

      {/* Signatures & Stamp */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '6px', fontSize: '10px' }}>
        <div style={{ textAlign: 'center', borderTop: '1px dashed #999', paddingTop: '4px' }}>
          {signatures?.classTeacher ? <div style={{ marginBottom: '4px' }}><SignatureRenderer sig={signatures.classTeacher} /></div> : <div style={{ height: '40px' }} />}
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10px' }}>{signatures?.classTeacher?.name || summary.classTeacherName || 'Class Teacher'}</p>
          <p style={{ margin: 0, fontSize: '9px', color: '#666' }}>Class Teacher</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          {stampUrl ? <img src={stampUrl} alt="Stamp" style={{ height: '60px', objectFit: 'contain', opacity: 0.8 }} /> : <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '9px', color: '#aaa', fontStyle: 'italic' }}>[School Stamp]</span></div>}
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px dashed #999', paddingTop: '4px' }}>
          {signatures?.headTeacher ? <div style={{ marginBottom: '4px' }}><SignatureRenderer sig={signatures.headTeacher} /></div> : <div style={{ height: '40px' }} />}
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10px' }}>{signatures?.headTeacher?.name || 'Head Teacher'}</p>
          <p style={{ margin: 0, fontSize: '9px', color: '#666' }}>Head Teacher / Principal</p>
        </div>
      </div>

      {/* Key */}
      <div style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '9px', marginBottom: '6px', backgroundColor: '#fafafa' }}>
        <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>Key to Terms Used:</p>
        <p style={{ margin: '1px 0' }}><strong>A1, A2, A3</strong> — Continuous Assessment | <strong>20%</strong> — CA contribution | <strong>80%</strong> — End of term exam</p>
        <p style={{ margin: '1px 0' }}><strong>ID 1 (Basic):</strong> 0.9–1.49 | <strong>ID 2 (Moderate):</strong> 1.5–2.49 | <strong>ID 3 (Outstanding):</strong> 2.5–3.0</p>
      </div>

      {/* Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', border: '1px solid #999', fontSize: '9.5px' }}>
        <FooterCell label="TERM ENDED ON" value={term.endDate || '—'} />
        <FooterCell label="NEXT TERM BEGINS" value={term.nextTermStart || '—'} />
        <FooterCell label="FEES BALANCE" value={term.feesBalance || '—'} />
        <FooterCell label="FEES NEXT TERM" value={term.feesNextTerm || '—'} />
        <FooterCell label="OTHER REQUIREMENTS" value={term.otherRequirements || '—'} last />
      </div>

      {school.footerMotto && <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', color: '#8B0000', marginTop: '8px', fontSize: '11px' }}>"{school.footerMotto}"</p>}
      <p style={{ textAlign: 'right', fontSize: '8px', color: '#999', marginTop: '4px' }}>Printed on: {term.printedDate}</p>
    </div>
  );
};

export default ClassicTemplate;
