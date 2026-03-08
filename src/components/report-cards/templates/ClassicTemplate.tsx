import { ReportData, SignatureRenderer, SummaryBox, AttendanceBox, FooterCell, cellStyle, Th, Td, calcAvg } from './shared';

const ClassicTemplate = ({ data }: { data: ReportData }) => {
  const { student, school, term, subjects, summary, gradingScale, attendance, signatures, stampUrl } = data;

  return (
    <div
      className="bg-white text-black mx-auto"
      style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11px', maxWidth: '210mm', padding: '8mm 10mm', position: 'relative', border: '3px solid #000' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ width: '80px', flexShrink: 0 }}>
          {school.logoUrl && <img src={school.logoUrl} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />}
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>{school.name}</h1>
          {school.motto && <p style={{ fontSize: '10px', fontStyle: 'italic', margin: '1px 0' }}>"{school.motto}"</p>}
          <p style={{ fontSize: '9.5px', margin: '1px 0' }}>Location: {school.address}</p>
          <p style={{ fontSize: '9.5px', margin: '1px 0' }}>Tel: {school.phone}</p>
          <p style={{ fontSize: '9.5px', margin: '1px 0' }}>Email: {school.email}{school.website ? ` | Website: ${school.website}` : ''}</p>
        </div>
        <div style={{ width: '80px', flexShrink: 0, textAlign: 'right' }}>
          {student.photoUrl ? (
            <img src={student.photoUrl} alt="Student" style={{ width: '70px', height: '85px', objectFit: 'cover', border: '1.5px solid #000', borderRadius: '2px' }} />
          ) : (
            <div style={{ width: '70px', height: '85px', border: '1.5px solid #000', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#999', textAlign: 'center' }}>
              Student<br />Photo
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', margin: '6px 0', padding: '6px', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>TERM {term.name} REPORT CARD {term.year}</h2>
      </div>

      {/* Student Info - Row Layout */}
      <div style={{ marginBottom: '6px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span><strong>NAME:</strong> {student.name?.toUpperCase()}</span>
          <span><strong>GENDER:</strong> {student.gender?.toUpperCase()}</span>
          <span><strong>TERM:</strong> {term.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span><strong>SECTION:</strong> {[student.stream, student.section].filter(Boolean).join(' — ')}</span>
          <span><strong>CLASS:</strong> {student.class}</span>
          <span><strong>Printed on {term.printedDate}</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '30px', marginBottom: '2px' }}>
          <span><strong>House:</strong> {student.house || '—'}</span>
          <span><strong>Age:</strong> {student.age ? `${student.age}` : '—'}</span>
        </div>
      </div>

      {/* Performance Records Title */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px', textDecoration: 'underline' }}>
        Performance Records
      </div>

      {/* Performance Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px', border: '1px solid #000' }}>
        <thead>
          <tr style={{ backgroundColor: '#e8e8e8' }}>
            <Th>Code</Th><Th align="left" wide>Subject</Th><Th>A1</Th><Th>A2</Th><Th>A3</Th><Th>AVG</Th><Th>20%</Th><Th>80%</Th><Th>100%</Th><Th>Ident</Th><Th>GRADE</Th><Th align="left" wide>Remarks/Descriptors</Th><Th>TR</Th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((sub, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f7f7f7' }}>
              <Td bold>{sub.code}</Td><Td align="left" bold>{sub.name}</Td>
              <Td>{sub.a1?.toFixed(0) ?? ''}</Td><Td>{sub.a2?.toFixed(0) ?? ''}</Td><Td>{sub.a3?.toFixed(0) ?? ''}</Td>
              <Td>{sub.avg?.toFixed(0) ?? ''}</Td><Td>{sub.ca20?.toFixed(0) ?? ''}</Td><Td>{sub.exam80?.toFixed(0) ?? ''}</Td>
              <Td bold>{sub.total100?.toFixed(0) ?? ''}</Td><Td>{sub.identifier}</Td><Td bold>{sub.grade}</Td>
              <Td align="left">{sub.remark}</Td><Td>{sub.teacherInitials}</Td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold' }}>
            <td colSpan={2} style={{ ...cellStyle, textAlign: 'left', paddingLeft: '4px' }}>AVERAGE:</td>
            <td colSpan={4} style={{ ...cellStyle, textAlign: 'center' }}>{calcAvg(subjects, 'avg')}</td>
            <td colSpan={7} style={cellStyle}></td>
          </tr>
        </tbody>
      </table>

      {/* Overall Summary Row */}
      <div style={{ display: 'flex', gap: '20px', padding: '6px 8px', border: '1px solid #000', marginBottom: '6px', fontSize: '11px', alignItems: 'center' }}>
        <span><strong>Overall Identifier:</strong> {summary.overallIdentifier || '—'}</span>
        <span style={{ flex: 1, textAlign: 'center' }}><strong>Overall Achievement:</strong> {summary.overallAchievement || '—'}</span>
        <span><strong>Overall Grade:</strong> <span style={{ fontSize: '16px', fontWeight: 'bold', border: '1px solid #000', padding: '1px 8px', marginLeft: '4px' }}>{summary.overallGrade || '—'}</span></span>
      </div>

      {/* Grading Scale */}
      {gradingScale.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px', border: '1px solid #000' }}>
          <tbody>
            <tr style={{ backgroundColor: '#e8e8e8' }}>
              <td style={{ ...cellStyle, fontWeight: 'bold', width: '60px' }}>GRADE</td>
              {gradingScale.map((g, i) => <td key={i} style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{g.grade}</td>)}
            </tr>
            <tr>
              <td style={{ ...cellStyle, fontWeight: 'bold' }}>SCORES</td>
              {gradingScale.map((g, i) => <td key={i} style={{ ...cellStyle, textAlign: 'center' }}>{g.maxScore} - {g.minScore}</td>)}
            </tr>
          </tbody>
        </table>
      )}

      {/* Comments with Signatures beside them */}
      <div style={{ border: '1px solid #000', marginBottom: '6px', position: 'relative' }}>
        {/* Class Teacher Comment */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #999', padding: '6px 8px' }}>
          <div style={{ flex: 1, fontSize: '10.5px' }}>
            <strong>Class teacher's Comment:</strong><br />
            <span style={{ fontStyle: 'italic' }}>{summary.classTeacherComment || 'No comment'}</span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '140px', paddingLeft: '10px' }}>
            {signatures?.classTeacher && <div style={{ marginBottom: '2px' }}><SignatureRenderer sig={signatures.classTeacher} /></div>}
            <p style={{ margin: 0, fontSize: '9px', fontStyle: 'italic', borderTop: '1px dashed #999', paddingTop: '2px' }}>
              <strong>Class Teacher's Signature:</strong>
            </p>
          </div>
        </div>
        {/* Head Teacher Comment */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '6px 8px', position: 'relative' }}>
          <div style={{ flex: 1, fontSize: '10.5px' }}>
            <strong>Headteacher's Comment:</strong><br />
            <span style={{ fontStyle: 'italic' }}>{summary.headTeacherComment || 'No comment'}</span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '140px', paddingLeft: '10px', position: 'relative' }}>
            {signatures?.headTeacher && <div style={{ marginBottom: '2px' }}><SignatureRenderer sig={signatures.headTeacher} /></div>}
            <p style={{ margin: 0, fontSize: '9px', fontStyle: 'italic', borderTop: '1px dashed #999', paddingTop: '2px' }}>
              <strong>Headteacher's Signature:</strong>
            </p>
            {/* Stamp overlaid near head teacher signature */}
            {stampUrl && (
              <div style={{
                position: 'absolute',
                right: '-10px',
                top: '10px',
                transform: 'rotate(-8deg)',
                zIndex: 10,
                pointerEvents: 'none',
                opacity: 0.7,
                mixBlendMode: 'multiply',
              }}>
                <img src={stampUrl} alt="School Stamp" style={{ width: '400px', height: '400px', objectFit: 'contain' }} />
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Key */}
      <div style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '9px', marginBottom: '6px', backgroundColor: '#fafafa' }}>
        <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>Key to Terms Used: A1 Average Chapter Assessment 80% End of term assessment</p>
        <p style={{ margin: '1px 0' }}><strong>1 - 0.9</strong> Few LOs achieved, but not | <strong>2 - 1.5</strong> Many LOs achieved | <strong>3 - 2.5</strong> Most or all LOs</p>
        <p style={{ margin: '1px 0' }}>Basic 1.49 sufficient for overall achievement | Moderate 2.49 enough for overall achievement | Outstanding 3.0 achieved for overall achievement</p>
      </div>

      {/* Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', border: '1px solid #000', fontSize: '9.5px' }}>
        <FooterCell label="TERM ENDED ON" value={term.endDate || '—'} />
        <FooterCell label="NEXT TERM BEGINS" value={term.nextTermStart || '—'} />
        <FooterCell label="FEES BALANCE" value={term.feesBalance || '—'} />
        <FooterCell label="FEES NEXT TERM" value={term.feesNextTerm || '—'} />
        <FooterCell label="Other Requirement" value={term.otherRequirements || '—'} last />
      </div>

      {school.footerMotto && <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', color: '#8B0000', marginTop: '8px', fontSize: '11px' }}>"{school.footerMotto}"</p>}
    </div>
  );
};

export default ClassicTemplate;
