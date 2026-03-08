import { ReportData, SignatureRenderer, calcAvg } from './shared';

const MinimalTemplate = ({ data }: { data: ReportData }) => {
  const { student, school, term, subjects, summary, gradingScale, attendance, signatures, stampUrl } = data;

  const s: React.CSSProperties = { border: '1px solid #ddd', padding: '2px 5px' };

  return (
    <div className="bg-white text-black mx-auto" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '11px', maxWidth: '210mm', padding: '10mm 12mm' }}>
      {/* Header - Minimal */}
      <div style={{ textAlign: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
        {school.logoUrl && <img src={school.logoUrl} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '4px' }} />}
        <h1 style={{ fontSize: '18px', fontWeight: '300', textTransform: 'uppercase', margin: '0 0 2px', letterSpacing: '3px', color: '#333' }}>{school.name}</h1>
        {school.motto && <p style={{ fontSize: '9px', fontStyle: 'italic', color: '#888', margin: '2px 0' }}>{school.motto}</p>}
        <p style={{ fontSize: '9px', color: '#999', margin: '2px 0' }}>{school.address} · {school.phone} · {school.email}</p>
      </div>

      {/* Title */}
      <h2 style={{ fontSize: '13px', fontWeight: '400', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '4px', color: '#555', margin: '0 0 12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
        {term.name} Report Card · {term.year}
      </h2>

      {/* Student Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', marginBottom: '12px', fontSize: '10px', color: '#444' }}>
        <div>
          <p style={{ margin: '3px 0' }}><span style={{ color: '#999', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '1px' }}>Name</span><br />{student.name?.toUpperCase()}</p>
          <p style={{ margin: '3px 0' }}><span style={{ color: '#999', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '1px' }}>Admission No</span><br />{student.admissionNo}</p>
        </div>
        <div>
          <p style={{ margin: '3px 0' }}><span style={{ color: '#999', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '1px' }}>Class</span><br />{student.class} {student.stream ? `— ${student.stream}` : ''}</p>
          <p style={{ margin: '3px 0' }}><span style={{ color: '#999', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '1px' }}>Section / House</span><br />{student.section} {student.house ? `/ ${student.house}` : ''}</p>
        </div>
        {student.photoUrl && (
          <div><img src={student.photoUrl} alt="Student" style={{ width: '50px', height: '62px', objectFit: 'cover', borderRadius: '2px' }} /></div>
        )}
      </div>

      {/* Performance */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '10px' }}>
        <thead>
          <tr>
            {['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'ID', 'Grade', 'Remark', 'TR'].map((h, i) => (
              <th key={i} style={{ ...s, backgroundColor: '#fafafa', fontWeight: '500', fontSize: '9px', textAlign: i === 1 || i === 11 ? 'left' : 'center', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((sub, idx) => (
            <tr key={idx}>
              <td style={{ ...s, textAlign: 'center', fontWeight: '500' }}>{sub.code}</td>
              <td style={{ ...s, fontWeight: '500' }}>{sub.name}</td>
              <td style={{ ...s, textAlign: 'center' }}>{sub.a1?.toFixed(1) ?? ''}</td>
              <td style={{ ...s, textAlign: 'center' }}>{sub.a2?.toFixed(1) ?? ''}</td>
              <td style={{ ...s, textAlign: 'center' }}>{sub.a3?.toFixed(1) ?? ''}</td>
              <td style={{ ...s, textAlign: 'center' }}>{sub.avg?.toFixed(1) ?? ''}</td>
              <td style={{ ...s, textAlign: 'center' }}>{sub.ca20?.toFixed(1) ?? ''}</td>
              <td style={{ ...s, textAlign: 'center' }}>{sub.exam80?.toFixed(1) ?? ''}</td>
              <td style={{ ...s, textAlign: 'center', fontWeight: '600' }}>{sub.total100?.toFixed(1) ?? ''}</td>
              <td style={{ ...s, textAlign: 'center' }}>{sub.identifier}</td>
              <td style={{ ...s, textAlign: 'center', fontWeight: '600' }}>{sub.grade}</td>
              <td style={s}>{sub.remark}</td>
              <td style={{ ...s, textAlign: 'center' }}>{sub.teacherInitials}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: '600' }}>
            <td colSpan={5} style={{ ...s, textAlign: 'right', color: '#666' }}>Average</td>
            <td style={{ ...s, textAlign: 'center' }}>{calcAvg(subjects, 'avg')}</td>
            <td style={{ ...s, textAlign: 'center' }}>{calcAvg(subjects, 'ca20')}</td>
            <td style={{ ...s, textAlign: 'center' }}>{calcAvg(subjects, 'exam80')}</td>
            <td style={{ ...s, textAlign: 'center' }}>{calcAvg(subjects, 'total100')}</td>
            <td colSpan={4} style={s}></td>
          </tr>
        </tbody>
      </table>

      {/* Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '10px', padding: '8px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
        {[
          { l: 'Average', v: `${summary.overallAvg}%` },
          { l: 'Grade', v: summary.overallGrade },
          { l: 'Identifier', v: summary.overallIdentifier },
          { l: 'Achievement', v: summary.overallAchievement },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '8px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.l}</p>
            <p style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: '300' }}>{item.v}</p>
          </div>
        ))}
      </div>

      {/* Attendance */}
      {attendance && attendance.totalDays > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '10px', fontSize: '10px' }}>
          {[{ l: 'Days', v: attendance.totalDays }, { l: 'Present', v: attendance.present }, { l: 'Absent', v: attendance.absent }, { l: 'Late', v: attendance.late }, { l: 'Rate', v: `${attendance.percentage}%` }].map((a, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '8px', color: '#aaa', textTransform: 'uppercase' }}>{a.l}</p>
              <p style={{ margin: '1px 0 0', fontWeight: '500' }}>{a.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      <div style={{ marginBottom: '10px', fontSize: '10px' }}>
        <div style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
          <span style={{ color: '#999', fontSize: '9px', textTransform: 'uppercase' }}>Class Teacher:</span> <span style={{ fontStyle: 'italic' }}>{summary.classTeacherComment || '—'}</span>
        </div>
        <div style={{ padding: '6px 0' }}>
          <span style={{ color: '#999', fontSize: '9px', textTransform: 'uppercase' }}>Head Teacher:</span> <span style={{ fontStyle: 'italic' }}>{summary.headTeacherComment || '—'}</span>
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '10px', fontSize: '10px' }}>
        <div style={{ textAlign: 'center' }}>
          {signatures?.classTeacher && <div style={{ marginBottom: '4px' }}><SignatureRenderer sig={signatures.classTeacher} /></div>}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: '4px' }}>
            <p style={{ margin: 0, fontWeight: '500' }}>{signatures?.classTeacher?.name || summary.classTeacherName || '—'}</p>
            <p style={{ margin: 0, fontSize: '8px', color: '#999' }}>Class Teacher</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {stampUrl ? <img src={stampUrl} alt="Stamp" style={{ height: '50px', objectFit: 'contain', opacity: 0.7 }} /> : null}
        </div>
        <div style={{ textAlign: 'center' }}>
          {signatures?.headTeacher && <div style={{ marginBottom: '4px' }}><SignatureRenderer sig={signatures.headTeacher} /></div>}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: '4px' }}>
            <p style={{ margin: 0, fontWeight: '500' }}>{signatures?.headTeacher?.name || '—'}</p>
            <p style={{ margin: 0, fontSize: '8px', color: '#999' }}>Head Teacher</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #eee', fontSize: '9px', color: '#888' }}>
        <span>Term ended: {term.endDate || '—'}</span>
        <span>Next term: {term.nextTermStart || '—'}</span>
        <span>Balance: {term.feesBalance || '—'}</span>
        <span>Next fees: {term.feesNextTerm || '—'}</span>
      </div>

      <p style={{ textAlign: 'right', fontSize: '7px', color: '#bbb', marginTop: '4px' }}>Printed: {term.printedDate}</p>
    </div>
  );
};

export default MinimalTemplate;
