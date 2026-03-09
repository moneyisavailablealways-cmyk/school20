import { ReportData, SignatureRenderer, calcAvg, StampOverlay } from './shared';

const ColorfulTemplate = ({ data }: { data: ReportData }) => {
  const { student, school, term, subjects, summary, gradingScale, attendance, signatures, stampUrl, stampConfig } = data;

  const getGradeBg = (grade: string) => {
    if (['D1', 'D2', 'A'].includes(grade)) return { bg: '#dcfce7', color: '#166534' };
    if (['C3', 'C4', 'C5', 'C6', 'B'].includes(grade)) return { bg: '#dbeafe', color: '#1e40af' };
    if (['P7', 'P8', 'C', 'D'].includes(grade)) return { bg: '#fef3c7', color: '#92400e' };
    return { bg: '#fecaca', color: '#991b1b' };
  };

  const cs: React.CSSProperties = { border: '1px solid #c4b5fd', padding: '2px 4px' };

  return (
    <div className="bg-white text-black mx-auto" style={{ fontFamily: "'Comic Sans MS', 'Nunito', cursive, sans-serif", fontSize: '11px', maxWidth: '210mm', padding: '8mm 10mm' }}>
      {/* Header - Colorful */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f59e0b 100%)', color: 'white', padding: '14px 16px', borderRadius: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {school.logoUrl && <img src={school.logoUrl} alt="Logo" style={{ width: '65px', height: '65px', objectFit: 'contain', borderRadius: '50%', background: 'white', padding: '4px' }} />}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, textTransform: 'uppercase' }}>🏫 {school.name}</h1>
          {school.motto && <p style={{ fontSize: '10px', margin: '2px 0', opacity: 0.95 }}>✨ "{school.motto}" ✨</p>}
          <p style={{ fontSize: '9px', margin: '2px 0', opacity: 0.85 }}>{school.address} | {school.phone} | {school.email}</p>
        </div>
        {student.photoUrl && <img src={student.photoUrl} alt="Student" style={{ width: '58px', height: '72px', objectFit: 'cover', borderRadius: '10px', border: '3px solid rgba(255,255,255,0.7)' }} />}
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', padding: '6px', marginBottom: '8px', background: 'linear-gradient(90deg, #fef3c7, #fce7f3, #dbeafe)', borderRadius: '8px', border: '2px solid #e9d5ff' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#7c3aed' }}>📋 {term.name} Report Card — {term.year} 📋</h2>
      </div>

      {/* Student Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '8px 10px', border: '2px solid #fbbf24' }}>
          <p style={{ margin: '2px 0' }}>👤 <strong>Name:</strong> {student.name?.toUpperCase()}</p>
          <p style={{ margin: '2px 0' }}>🏷️ <strong>Adm No:</strong> {student.admissionNo}</p>
          <p style={{ margin: '2px 0' }}>⚧ <strong>Gender:</strong> {student.gender} | 🎂 <strong>Age:</strong> {student.age} yrs</p>
        </div>
        <div style={{ background: '#dbeafe', borderRadius: '8px', padding: '8px 10px', border: '2px solid #60a5fa' }}>
          <p style={{ margin: '2px 0' }}>📚 <strong>Class:</strong> {student.class}</p>
          <p style={{ margin: '2px 0' }}>🏠 <strong>Stream:</strong> {student.stream || '—'} | <strong>Section:</strong> {student.section}</p>
          <p style={{ margin: '2px 0' }}>🏰 <strong>House:</strong> {student.house || '—'} | <strong>Level:</strong> {student.level || '—'}</p>
        </div>
      </div>

      {/* Performance Table */}
      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '2px solid #c4b5fd', marginBottom: '8px' }}>
        <div style={{ background: 'linear-gradient(90deg, #7c3aed, #ec4899)', color: 'white', padding: '4px 8px', fontWeight: '800', fontSize: '11px', textAlign: 'center' }}>⭐ Performance Records ⭐</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ background: '#f5f3ff' }}>
              {['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'ID', 'Grade', 'Remarks', 'TR'].map((h, i) => (
                <th key={i} style={{ ...cs, fontWeight: '700', fontSize: '9px', textAlign: i === 1 || i === 11 ? 'left' : 'center', color: '#7c3aed' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, idx) => {
              const gc = getGradeBg(sub.grade);
              return (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fefbff' : '#faf5ff' }}>
                  <td style={{ ...cs, textAlign: 'center', fontWeight: '600' }}>{sub.code}</td>
                  <td style={{ ...cs, fontWeight: '600' }}>{sub.name}</td>
                  <td style={{ ...cs, textAlign: 'center' }}>{sub.a1?.toFixed(1) ?? ''}</td>
                  <td style={{ ...cs, textAlign: 'center' }}>{sub.a2?.toFixed(1) ?? ''}</td>
                  <td style={{ ...cs, textAlign: 'center' }}>{sub.a3?.toFixed(1) ?? ''}</td>
                  <td style={{ ...cs, textAlign: 'center' }}>{sub.avg?.toFixed(1) ?? ''}</td>
                  <td style={{ ...cs, textAlign: 'center' }}>{sub.ca20?.toFixed(1) ?? ''}</td>
                  <td style={{ ...cs, textAlign: 'center' }}>{sub.exam80?.toFixed(1) ?? ''}</td>
                  <td style={{ ...cs, textAlign: 'center', fontWeight: '700' }}>{sub.total100?.toFixed(1) ?? ''}</td>
                  <td style={{ ...cs, textAlign: 'center' }}>{sub.identifier}</td>
                  <td style={{ ...cs, textAlign: 'center', fontWeight: '800', background: gc.bg, color: gc.color, borderRadius: '3px' }}>{sub.grade}</td>
                  <td style={cs}>{sub.remark}</td>
                  <td style={{ ...cs, textAlign: 'center' }}>{sub.teacherInitials}</td>
                </tr>
              );
            })}
            <tr style={{ background: '#e9d5ff', fontWeight: '700' }}>
              <td colSpan={5} style={{ ...cs, textAlign: 'right' }}>📊 AVERAGE:</td>
              <td style={{ ...cs, textAlign: 'center' }}>{calcAvg(subjects, 'avg')}</td>
              <td style={{ ...cs, textAlign: 'center' }}>{calcAvg(subjects, 'ca20')}</td>
              <td style={{ ...cs, textAlign: 'center' }}>{calcAvg(subjects, 'exam80')}</td>
              <td style={{ ...cs, textAlign: 'center' }}>{calcAvg(subjects, 'total100')}</td>
              <td colSpan={4} style={cs}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
        {[
          { label: '📈 Average', value: `${summary.overallAvg}%`, bg: '#dcfce7', border: '#86efac' },
          { label: '🏆 Grade', value: summary.overallGrade, bg: '#dbeafe', border: '#93c5fd' },
          { label: '🎯 Identifier', value: summary.overallIdentifier, bg: '#fef3c7', border: '#fcd34d' },
          { label: '⭐ Achievement', value: summary.overallAchievement, bg: '#fce7f3', border: '#f9a8d4' },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: '10px', backgroundColor: item.bg, border: `2px solid ${item.border}` }}>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: '700' }}>{item.label}</p>
            <p style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: '800' }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Attendance */}
      {attendance && attendance.totalDays > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {[
            { l: '📅 Days', v: attendance.totalDays, bg: '#e0e7ff' },
            { l: '✅ Present', v: attendance.present, bg: '#dcfce7' },
            { l: '❌ Absent', v: attendance.absent, bg: '#fecaca' },
            { l: '⏰ Late', v: attendance.late, bg: '#fef3c7' },
            { l: '📊 Rate', v: `${attendance.percentage}%`, bg: '#f3e8ff' },
          ].map((a, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '4px', background: a.bg, borderRadius: '6px' }}>
              <p style={{ margin: 0, fontSize: '8px', fontWeight: '700' }}>{a.l}</p>
              <p style={{ margin: '1px 0 0', fontSize: '13px', fontWeight: '800' }}>{a.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '8px 10px', border: '2px solid #fbbf24', marginBottom: '4px' }}>
          💬 <strong>Class Teacher:</strong> <span style={{ fontStyle: 'italic' }}>{summary.classTeacherComment || 'No comment'}</span>
        </div>
        <div style={{ background: '#dcfce7', borderRadius: '8px', padding: '8px 10px', border: '2px solid #86efac' }}>
          💬 <strong>Head Teacher:</strong> <span style={{ fontStyle: 'italic' }}>{summary.headTeacherComment || 'No comment'}</span>
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px', fontSize: '10px' }}>
        <div style={{ textAlign: 'center', paddingBottom: '6px' }}>
          <p style={{ margin: 0, fontWeight: '700' }}>{signatures?.classTeacher?.name || summary.classTeacherName || 'Class Teacher'}</p>
          <p style={{ margin: '0 0 4px', fontSize: '9px', color: '#7c3aed' }}>✍️ Class Teacher</p>
          {signatures?.classTeacher && <div style={{ marginTop: '4px' }}><SignatureRenderer sig={signatures.classTeacher} /></div>}
          <div style={{ borderBottom: '2px dashed #c4b5fd', marginTop: '4px' }} />
        </div>
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Stamp via overlay */}
        </div>
        <div style={{ textAlign: 'center', paddingBottom: '6px' }}>
          <p style={{ margin: 0, fontWeight: '700' }}>{signatures?.headTeacher?.name || 'Head Teacher'}</p>
          <p style={{ margin: '0 0 4px', fontSize: '9px', color: '#7c3aed' }}>✍️ Head Teacher</p>
          {signatures?.headTeacher && <div style={{ marginTop: '4px' }}><SignatureRenderer sig={signatures.headTeacher} /></div>}
          <div style={{ borderBottom: '2px dashed #c4b5fd', marginTop: '4px' }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', borderRadius: '8px', overflow: 'hidden', border: '2px solid #c4b5fd', fontSize: '9px' }}>
        {[
          { l: '📅 Term Ended', v: term.endDate, bg: '#fef3c7' },
          { l: '📅 Next Term', v: term.nextTermStart, bg: '#dbeafe' },
          { l: '💰 Balance', v: term.feesBalance, bg: '#fce7f3' },
          { l: '💰 Next Fees', v: term.feesNextTerm, bg: '#dcfce7' },
          { l: '📝 Requirements', v: term.otherRequirements, bg: '#f3e8ff' },
        ].map((f, i) => (
          <div key={i} style={{ padding: '4px 6px', borderRight: i < 4 ? '1px solid #c4b5fd' : 'none', background: f.bg }}>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '8px' }}>{f.l}</p>
            <p style={{ margin: '1px 0 0' }}>{f.v || '—'}</p>
          </div>
        ))}
      </div>

      {school.footerMotto && <p style={{ textAlign: 'center', fontWeight: '800', color: '#7c3aed', marginTop: '8px', fontSize: '11px' }}>🌟 "{school.footerMotto}" 🌟</p>}
      <p style={{ textAlign: 'right', fontSize: '8px', color: '#a78bfa', marginTop: '4px' }}>Printed: {term.printedDate}</p>
    </div>
  );
};

export default ColorfulTemplate;
