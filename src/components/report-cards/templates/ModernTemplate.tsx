import { ReportData, SignatureRenderer, calcAvg, StampOverlay } from './shared';

const ModernTemplate = ({ data }: { data: ReportData }) => {
  const { student, school, term, subjects, summary, gradingScale, attendance, signatures, stampUrl, stampConfig } = data;

  const getGradeColor = (grade: string) => {
    if (['D1', 'D2', 'A'].includes(grade)) return '#16a34a';
    if (['C3', 'C4', 'C5', 'C6', 'B'].includes(grade)) return '#2563eb';
    if (['P7', 'P8', 'C', 'D'].includes(grade)) return '#d97706';
    return '#dc2626';
  };

  return (
    <div className="bg-white text-black mx-auto" style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", fontSize: '11px', maxWidth: '210mm', padding: '8mm 10mm', position: 'relative' }}>
      <StampOverlay stampUrl={stampUrl} stampConfig={stampConfig} />
      {/* Header - Modern gradient accent */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: 'white', padding: '12px 16px', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {school.logoUrl && <img src={school.logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px', background: 'white', padding: '4px' }} />}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>{school.name}</h1>
          {school.motto && <p style={{ fontSize: '10px', margin: '2px 0', opacity: 0.9, fontStyle: 'italic' }}>"{school.motto}"</p>}
          <p style={{ fontSize: '9px', margin: '2px 0', opacity: 0.8 }}>{school.address} | Tel: {school.phone} | {school.email}</p>
        </div>
        {student.photoUrl && <img src={student.photoUrl} alt="Student" style={{ width: '55px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '2px solid rgba(255,255,255,0.5)' }} />}
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', padding: '6px', marginBottom: '8px', borderBottom: '3px solid #2563eb' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#1e3a5f', textTransform: 'uppercase' }}>{term.name} Report Card — {term.year}</h2>
      </div>

      {/* Student Info - Modern card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '8px 12px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: '2px 0' }}><strong style={{ color: '#64748b' }}>Name:</strong> {student.name?.toUpperCase()}</p>
          <p style={{ margin: '2px 0' }}><strong style={{ color: '#64748b' }}>Adm. No:</strong> {student.admissionNo}</p>
          <p style={{ margin: '2px 0' }}><strong style={{ color: '#64748b' }}>Gender:</strong> {student.gender} | <strong style={{ color: '#64748b' }}>Age:</strong> {student.age} yrs</p>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '8px 12px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: '2px 0' }}><strong style={{ color: '#64748b' }}>Class:</strong> {student.class}</p>
          <p style={{ margin: '2px 0' }}><strong style={{ color: '#64748b' }}>Stream:</strong> {student.stream || '—'} | <strong style={{ color: '#64748b' }}>Section:</strong> {student.section}</p>
          <p style={{ margin: '2px 0' }}><strong style={{ color: '#64748b' }}>House:</strong> {student.house || '—'} | <strong style={{ color: '#64748b' }}>Level:</strong> {student.level || '—'}</p>
        </div>
      </div>

      {/* Performance Table */}
      <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
        <div style={{ background: '#1e3a5f', color: 'white', padding: '4px 8px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Performance Records</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              {['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'ID', 'Grade', 'Remarks', 'TR'].map((h, i) => (
                <th key={i} style={{ border: '1px solid #e2e8f0', padding: '3px 4px', fontSize: '9px', textAlign: i === 1 || i === 11 ? 'left' : 'center', fontWeight: '600', color: '#475569' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center', fontWeight: '600' }}>{sub.code}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', fontWeight: '600' }}>{sub.name}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{sub.a1?.toFixed(1) ?? ''}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{sub.a2?.toFixed(1) ?? ''}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{sub.a3?.toFixed(1) ?? ''}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{sub.avg?.toFixed(1) ?? ''}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{sub.ca20?.toFixed(1) ?? ''}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{sub.exam80?.toFixed(1) ?? ''}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center', fontWeight: '700' }}>{sub.total100?.toFixed(1) ?? ''}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{sub.identifier}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center', fontWeight: '700', color: getGradeColor(sub.grade) }}>{sub.grade}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px' }}>{sub.remark}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{sub.teacherInitials}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#e2e8f0', fontWeight: '700' }}>
              <td colSpan={5} style={{ border: '1px solid #e2e8f0', padding: '2px 6px', textAlign: 'right' }}>AVERAGE:</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{calcAvg(subjects, 'avg')}</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{calcAvg(subjects, 'ca20')}</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{calcAvg(subjects, 'exam80')}</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{calcAvg(subjects, 'total100')}</td>
              <td colSpan={4} style={{ border: '1px solid #e2e8f0', padding: '2px 4px' }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
        {[
          { label: 'Average', value: `${summary.overallAvg}%`, bg: '#dbeafe', color: '#1e40af' },
          { label: 'Grade', value: summary.overallGrade, bg: '#dcfce7', color: '#166534' },
          { label: 'Identifier', value: summary.overallIdentifier, bg: '#fef3c7', color: '#92400e' },
          { label: 'Achievement', value: summary.overallAchievement, bg: '#f3e8ff', color: '#6b21a8' },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: '6px', backgroundColor: item.bg }}>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: '600', color: item.color, textTransform: 'uppercase' }}>{item.label}</p>
            <p style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: '800', color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Attendance */}
      {attendance && attendance.totalDays > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {[
            { l: 'Total Days', v: attendance.totalDays },
            { l: 'Present', v: attendance.present },
            { l: 'Absent', v: attendance.absent },
            { l: 'Late', v: attendance.late },
            { l: 'Rate', v: `${attendance.percentage}%` },
          ].map((a, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '4px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '8px', color: '#64748b', fontWeight: '600' }}>{a.l}</p>
              <p style={{ margin: '1px 0 0', fontSize: '12px', fontWeight: '700' }}>{a.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grading Scale */}
      {gradingScale.length > 0 && (
        <div style={{ marginBottom: '6px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <tbody>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', fontWeight: '700', width: '50px' }}>Grade</td>
                {gradingScale.map((g, i) => <td key={i} style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center', fontWeight: '700' }}>{g.grade}</td>)}
              </tr>
              <tr>
                <td style={{ border: '1px solid #e2e8f0', padding: '2px 4px', fontWeight: '700' }}>Scores</td>
                {gradingScale.map((g, i) => <td key={i} style={{ border: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center' }}>{g.maxScore}–{g.minScore}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Comments */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '8px 12px', border: '1px solid #e2e8f0', marginBottom: '4px' }}>
          <strong style={{ color: '#1e3a5f' }}>Class Teacher's Comment:</strong> <span style={{ fontStyle: 'italic' }}>{summary.classTeacherComment || 'No comment'}</span>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '8px 12px', border: '1px solid #e2e8f0' }}>
          <strong style={{ color: '#1e3a5f' }}>Head Teacher's Comment:</strong> <span style={{ fontStyle: 'italic' }}>{summary.headTeacherComment || 'No comment'}</span>
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px', fontSize: '10px' }}>
        <div style={{ textAlign: 'center', paddingBottom: '6px' }}>
          <p style={{ margin: 0, fontWeight: '700', fontSize: '10px' }}>{signatures?.classTeacher?.name || summary.classTeacherName || 'Class Teacher'}</p>
          <p style={{ margin: '0 0 4px', fontSize: '9px', color: '#64748b' }}>Class Teacher</p>
          {signatures?.classTeacher && <div style={{ marginTop: '4px' }}><SignatureRenderer sig={signatures.classTeacher} /></div>}
          <div style={{ borderBottom: '2px solid #2563eb', marginTop: '4px' }} />
        </div>
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '9px', color: '#aaa' }}>[Stamp]</span>
        </div>
        <div style={{ textAlign: 'center', paddingBottom: '6px' }}>
          <p style={{ margin: 0, fontWeight: '700', fontSize: '10px' }}>{signatures?.headTeacher?.name || 'Head Teacher'}</p>
          <p style={{ margin: '0 0 4px', fontSize: '9px', color: '#64748b' }}>Head Teacher / Principal</p>
          {signatures?.headTeacher && <div style={{ marginTop: '4px' }}><SignatureRenderer sig={signatures.headTeacher} /></div>}
          <div style={{ borderBottom: '2px solid #2563eb', marginTop: '4px' }} />
        </div>
      </div>

      {/* Key */}
      <div style={{ background: '#f8fafc', borderRadius: '4px', padding: '4px 8px', fontSize: '9px', marginBottom: '6px', border: '1px solid #e2e8f0' }}>
        <p style={{ fontWeight: '700', margin: '0 0 2px 0' }}>Key: </p>
        <span><strong>A1–A3</strong> Continuous Assessment | <strong>20%</strong> CA | <strong>80%</strong> Exam | <strong>ID 1</strong> Basic | <strong>ID 2</strong> Moderate | <strong>ID 3</strong> Outstanding</span>
      </div>

      {/* Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: '9px' }}>
        {[
          { l: 'Term Ended', v: term.endDate },
          { l: 'Next Term', v: term.nextTermStart },
          { l: 'Fees Balance', v: term.feesBalance },
          { l: 'Fees Next Term', v: term.feesNextTerm },
          { l: 'Requirements', v: term.otherRequirements },
        ].map((f, i) => (
          <div key={i} style={{ padding: '4px 6px', borderRight: i < 4 ? '1px solid #e2e8f0' : 'none', background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '8px', color: '#64748b', textTransform: 'uppercase' }}>{f.l}</p>
            <p style={{ margin: '1px 0 0' }}>{f.v || '—'}</p>
          </div>
        ))}
      </div>

      {school.footerMotto && <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: '600', color: '#1e3a5f', marginTop: '8px', fontSize: '10px' }}>"{school.footerMotto}"</p>}
      <p style={{ textAlign: 'right', fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>Printed on: {term.printedDate}</p>
    </div>
  );
};

export default ModernTemplate;
