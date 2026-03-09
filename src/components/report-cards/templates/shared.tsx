import React from 'react';

export interface SubjectData {
  code: string;
  name: string;
  a1: number | null;
  a2: number | null;
  a3: number | null;
  avg: number | null;
  ca20: number | null;
  exam80: number | null;
  total100: number | null;
  identifier: number;
  grade: string;
  remark: string;
  teacherInitials: string;
}

export interface ReportData {
  student: {
    name: string;
    gender: string;
    section: string;
    class: string;
    stream: string;
    level: string;
    house: string;
    age: number;
    photoUrl: string;
    admissionNo: string;
  };
  school: {
    name: string;
    motto: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logoUrl: string;
    footerMotto: string;
    badge: string;
  };
  term: {
    name: string;
    year: string;
    printedDate: string;
    endDate: string;
    nextTermStart: string;
    feesBalance: string;
    feesNextTerm: string;
    otherRequirements: string;
  };
  subjects: SubjectData[];
  summary: {
    overallAvg: number;
    overallGrade: string;
    overallIdentifier: number;
    overallAchievement: string;
    classTeacherComment: string;
    headTeacherComment: string;
    classTeacherName?: string;
  };
  attendance?: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
  signatures?: {
    classTeacher: any;
    headTeacher: any;
  };
  stampUrl?: string;
  stampConfig?: {
    positionX: number;
    positionY: number;
    size: string;
    customScale: number;
    opacity: number;
    rotation: number;
  };
  templateType?: string;
  gradingScale: Array<{ grade: string; minScore: number; maxScore: number }>;
}

export const cellStyle: React.CSSProperties = {
  border: '1px solid #bbb',
  padding: '2px 4px',
};

export const Th = ({ children, align = 'center', wide = false }: { children: React.ReactNode; align?: string; wide?: boolean }) => (
  <th style={{ ...cellStyle, textAlign: align as any, fontWeight: 'bold', fontSize: '9.5px', whiteSpace: 'nowrap', minWidth: wide ? '80px' : undefined }}>
    {children}
  </th>
);

export const Td = ({ children, align = 'center', bold = false }: { children: React.ReactNode; align?: string; bold?: boolean }) => (
  <td style={{ ...cellStyle, textAlign: align as any, fontWeight: bold ? 'bold' : 'normal' }}>
    {children}
  </td>
);

export const InfoRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <>
    <div style={{ padding: '2px 6px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>{label}:</div>
    <div style={{ padding: '2px 6px', borderBottom: '1px solid #eee' }}>{value || '—'}</div>
  </>
);

export const SummaryBox = ({ label, value, last = false, bg }: { label: string; value: string | number; last?: boolean; bg?: string }) => (
  <div style={{ textAlign: 'center', padding: '6px 4px', borderRight: last ? 'none' : '1px solid #999', backgroundColor: bg }}>
    <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#555' }}>{label}</p>
    <p style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 'bold' }}>{value}</p>
  </div>
);

export const AttendanceBox = ({ label, value, last = false, color }: { label: string; value: string | number; last?: boolean; color?: string }) => (
  <div style={{ textAlign: 'center', padding: '4px', borderRight: last ? 'none' : '1px solid #999' }}>
    <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', color: color || '#555' }}>{label}</p>
    <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 'bold' }}>{value}</p>
  </div>
);

export const FooterCell = ({ label, value, last = false }: { label: string; value: string; last?: boolean }) => (
  <div style={{ padding: '4px 6px', borderRight: last ? 'none' : '1px solid #999' }}>
    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '9px' }}>{label}</p>
    <p style={{ margin: '2px 0 0' }}>{value}</p>
  </div>
);

export const SignatureRenderer = ({ sig }: { sig: any }) => {
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

const SIZE_SCALES: Record<string, number> = { small: 60, medium: 100, large: 150 };

export const StampOverlay = ({ stampUrl, stampConfig }: { stampUrl?: string; stampConfig?: ReportData['stampConfig'] }) => {
  if (!stampUrl) return null;
  const cfg = stampConfig || { positionX: 85, positionY: 75, size: 'medium', customScale: 100, opacity: 70, rotation: -8 };
  const scale = cfg.size === 'custom' ? cfg.customScale : (SIZE_SCALES[cfg.size] || 100);
  const stampPx = Math.round(120 * scale / 100);

  return (
    <div style={{
      position: 'absolute',
      left: `${cfg.positionX}%`,
      top: `${cfg.positionY}%`,
      transform: `translate(-50%, -50%) rotate(${cfg.rotation}deg)`,
      zIndex: 10,
      pointerEvents: 'none',
      opacity: cfg.opacity / 100,
      mixBlendMode: 'multiply',
    }}>
      <img src={stampUrl} alt="School Stamp" style={{ width: `${stampPx}px`, height: `${stampPx}px`, objectFit: 'contain' }} />
    </div>
  );
};

export const calcAvg = (subjects: SubjectData[], key: keyof SubjectData) => {
  const vals = subjects.filter(s => s[key] !== null && s[key] !== undefined);
  if (vals.length === 0) return '';
  return (vals.reduce((sum, s) => sum + Number(s[key]), 0) / vals.length).toFixed(1);
};
