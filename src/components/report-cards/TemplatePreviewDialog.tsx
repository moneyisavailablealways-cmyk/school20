import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2 } from 'lucide-react';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType: string;
  templateName: string;
  schoolSettings?: {
    school_name?: string;
    motto?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo_url?: string;
  } | null;
}

const sampleSubjects = [
  { code: 'MATH123', name: 'Mathematics', a1: 1, a2: 2, a3: 1, avg: 2, ca20: 12, exam80: 43, total: 55, ident: 1, grade: 'D', remark: 'Basic', ir: 'D.M' },
  { code: 'ART123', name: 'Art', a1: 2, a2: 3, a3: 2, avg: 3, ca20: 14, exam80: 54, total: 68, ident: 2, grade: 'C', remark: 'Basic', ir: 'W.S' },
  { code: 'KIS123', name: 'KISWAHILI', a1: 1, a2: 2, a3: 2, avg: 2, ca20: 17, exam80: 71, total: 88, ident: 3, grade: 'A', remark: 'Outstanding', ir: 'S.O' },
  { code: 'ZS456', name: 'Bio', a1: 2, a2: 3, a3: 3, avg: 3, ca20: 20, exam80: 30, total: 50, ident: 1, grade: 'D', remark: 'Basic', ir: 'D.S' },
  { code: 'LIT123', name: 'LITE', a1: 2, a2: 2, a3: 2, avg: 2, ca20: 12, exam80: 74, total: 88, ident: 3, grade: 'A', remark: 'Outstanding', ir: 'A.A' },
  { code: 'IRE123', name: 'IRE', a1: 2, a2: 2, a3: 2, avg: 2, ca20: 12, exam80: 31, total: 43, ident: 1, grade: 'D', remark: 'Basic', ir: 'B.K' },
  { code: 'LUGA123', name: 'LUGANDA', a1: 2, a2: 2, a3: 2, avg: 2, ca20: 12, exam80: 62, total: 74, ident: 3, grade: 'B', remark: 'Outstanding', ir: 'A.V' },
  { code: 'ENG123', name: 'English', a1: 2, a2: 2, a3: 2, avg: 2, ca20: 20, exam80: 78, total: 98, ident: 3, grade: 'A', remark: 'Outstanding', ir: '' },
  { code: 'CRE123', name: 'CRE', a1: 1, a2: 2, a3: 2, avg: 2, ca20: 10, exam80: 30, total: 40, ident: 1, grade: 'D', remark: 'Basic', ir: 'A.L' },
  { code: 'CHEM123', name: 'CHEMI', a1: 2, a2: 2, a3: 2, avg: 2, ca20: 12, exam80: 70, total: 82, ident: 2, grade: 'A', remark: 'Moderate', ir: 'L.L' },
  { code: 'GEOG', name: 'GEOG', a1: 2, a2: 2, a3: 2, avg: 2, ca20: 15, exam80: 40, total: 55, ident: 2, grade: 'D', remark: 'Moderate', ir: 'N.F' },
  { code: 'PHY123', name: 'Physics', a1: 1, a2: 1, a3: 1, avg: 1, ca20: 12, exam80: 61, total: 73, ident: 2, grade: 'B', remark: 'Moderate', ir: 'A.A' },
  { code: 'COMM123', name: 'COMMERCE', a1: 2, a2: 2, a3: 3, avg: 3, ca20: 14, exam80: 40, total: 54, ident: 2, grade: 'C', remark: 'Moderate', ir: 'L.W' },
  { code: 'AGRI123', name: 'AGRIC', a1: 1, a2: 2, a3: 2, avg: 2, ca20: 17, exam80: 61, total: 78, ident: 2, grade: 'B', remark: 'Moderate', ir: 'A.L' },
  { code: 'ENT123', name: 'ENT', a1: 2, a2: 1, a3: 1, avg: 1, ca20: 14, exam80: 54, total: 68, ident: 2, grade: 'C', remark: 'Moderate', ir: 'A.I' },
  { code: 'HIS123', name: 'History', a1: 2, a2: 1, a3: 1, avg: 1, ca20: 12, exam80: 60, total: 72, ident: 2, grade: 'B', remark: 'Moderate', ir: 'W.W' },
];

const gradingScale = [
  { grade: 'A', label: '100 - 80', color: 'bg-green-500' },
  { grade: 'B', label: '80 - 70', color: 'bg-blue-500' },
  { grade: 'C', label: '69 - 60', color: 'bg-yellow-500' },
  { grade: 'D', label: '60 - 40', color: 'bg-orange-500' },
  { grade: 'E', label: '40 - 0', color: 'bg-red-500' },
];

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return 'bg-green-100 text-green-800';
    case 'B': return 'bg-blue-100 text-blue-800';
    case 'C': return 'bg-yellow-100 text-yellow-800';
    case 'D': return 'bg-orange-100 text-orange-800';
    case 'E': return 'bg-red-100 text-red-800';
    default: return '';
  }
};

const getIdentColor = (ident: number) => {
  switch (ident) {
    case 3: return 'bg-green-200 text-green-900';
    case 2: return 'bg-yellow-200 text-yellow-900';
    case 1: return 'bg-orange-200 text-orange-900';
    default: return '';
  }
};

const ReportCardPreviewContent = ({ schoolSettings, templateType }: { schoolSettings: TemplatePreviewDialogProps['schoolSettings']; templateType: string }) => {
  const schoolName = schoolSettings?.school_name || 'EXCELLENCE ACADEMY Y2';
  const motto = schoolSettings?.motto || 'Excellence in Education';
  const address = schoolSettings?.address || 'Location: BUKALANGO';
  const phone = schoolSettings?.phone || '+1-234-567-8900';
  const email = schoolSettings?.email || 'info@excellenceacademy.edu';
  const website = schoolSettings?.website || 'www.excellenceacademy.edu';

  const isModern = templateType === 'modern';
  const isMinimal = templateType === 'minimal';
  const isColorful = templateType === 'colorful';

  const headerBg = isModern ? 'bg-blue-700 text-white' : isColorful ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white' : '';
  const tableBorderColor = isModern ? 'border-blue-300' : isColorful ? 'border-orange-300' : 'border-gray-400';
  const headerCellBg = isModern ? 'bg-blue-600 text-white' : isColorful ? 'bg-orange-500 text-white' : isMinimal ? 'bg-gray-100' : 'bg-amber-100';
  const footerBg = isModern ? 'bg-blue-700 text-white' : isColorful ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white' : 'bg-amber-400 text-black';

  return (
    <div className="bg-white text-black p-5 print:p-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10px', lineHeight: '1.4' }}>
      {/* ====== HEADER ====== */}
      <div className={`flex items-start justify-between pb-3 mb-3 border-b-2 ${tableBorderColor} ${headerBg} ${headerBg ? 'p-4 rounded-t-lg -m-5 mb-3 px-5 pt-5' : ''}`}>
        <div className="flex-shrink-0">
          {schoolSettings?.logo_url ? (
            <img src={schoolSettings.logo_url} alt="School Logo" className="h-16 w-16 object-contain" />
          ) : (
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center border">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 text-center px-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">{schoolName}</h1>
          <p className="text-xs italic">"{motto}"</p>
          <p className="text-[9px]">{address}</p>
          <p className="text-[9px]">P.O BOX: P.o. Box 1234</p>
          <p className="text-[9px] font-semibold">TEL: {phone}</p>
          <p className="text-[9px]">Email: {email} | Website: {website}</p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-muted/30 rounded flex items-center justify-center border">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ====== REPORT TITLE ====== */}
      <div className="text-center mb-3">
        <h2 className="text-base font-bold uppercase tracking-wider">TERM TERM 1 REPORT CARD 2025</h2>
      </div>

      {/* ====== STUDENT INFO ====== */}
      <div className={`grid grid-cols-3 gap-x-4 gap-y-1 mb-3 text-[10px] border ${tableBorderColor} p-2 rounded`}>
        <div><strong>NAME:</strong> BRUNO</div>
        <div><strong>GENDER:</strong> MALE</div>
        <div className="text-right"><strong>TERM:</strong> TERM 1</div>
        <div><strong>SECTION:</strong> East</div>
        <div><strong>CLASS:</strong> Form 1</div>
        <div className="text-right"><strong>Printed on:</strong> 08/03/2026</div>
        <div><strong>House:</strong> Blue</div>
        <div><strong>Age:</strong> 29</div>
        <div></div>
      </div>

      {/* ====== PERFORMANCE RECORDS ====== */}
      <div className="mb-3">
        <h3 className="text-center text-xs font-bold uppercase mb-1 tracking-wider">Performance Records</h3>
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className={headerCellBg}>
              <th className={`border ${tableBorderColor} px-1 py-1 text-left font-bold`}>Code</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-left font-bold`}>Subject</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>A1</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>A2</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>A3</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>AVG</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>20%</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>85%</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>100%</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>Ident</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>GRADE</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-left font-bold`}>Remarks/Descriptors</th>
              <th className={`border ${tableBorderColor} px-1 py-1 text-center font-bold`}>IR</th>
            </tr>
          </thead>
          <tbody>
            {sampleSubjects.map((s, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : (isMinimal ? 'bg-gray-50' : 'bg-amber-50/30')}>
                <td className={`border ${tableBorderColor} px-1 py-0.5`}>{s.code}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 font-medium`}>{s.name}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>{s.a1}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>{s.a2}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>{s.a3}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>{s.avg}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>{s.ca20}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>{s.exam80}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center font-bold`}>{s.total}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>
                  <span className={`inline-block w-5 h-5 leading-5 rounded text-[8px] font-bold ${getIdentColor(s.ident)}`}>{s.ident}</span>
                </td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>
                  <span className={`inline-block px-1.5 py-0 rounded text-[8px] font-bold ${getGradeColor(s.grade)}`}>{s.grade}</span>
                </td>
                <td className={`border ${tableBorderColor} px-1 py-0.5`}>{s.remark}</td>
                <td className={`border ${tableBorderColor} px-1 py-0.5 text-center`}>{s.ir}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Average Row */}
        <div className={`border ${tableBorderColor} border-t-0 p-1 font-bold text-xs ${isMinimal ? 'bg-gray-100' : 'bg-amber-100'}`}>
          AVERAGE: <span className="text-base ml-2">68</span>
        </div>
      </div>

      {/* ====== OVERALL SUMMARY ====== */}
      <div className={`flex items-center justify-between border ${tableBorderColor} p-2 mb-3 text-xs rounded`}>
        <div><strong>Overall Identifier:</strong> <span className="text-lg font-bold ml-1">2</span></div>
        <div><strong>Overall Achievement:</strong> <span className="font-bold ml-1">Moderate</span></div>
        <div><strong>Overall Grade:</strong> <span className={`inline-block ml-1 px-2 py-0.5 rounded text-lg font-bold ${getGradeColor('C')}`}>C</span></div>
      </div>

      {/* ====== GRADING SCALE ====== */}
      <div className="mb-3">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th className={`border ${tableBorderColor} px-2 py-1 text-left ${headerCellBg} font-bold`}>GRADE</th>
              {gradingScale.map(g => (
                <th key={g.grade} className={`border ${tableBorderColor} px-2 py-1 text-center font-bold ${g.color} text-white`}>{g.grade}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`border ${tableBorderColor} px-2 py-1 font-bold ${headerCellBg}`}>SCORES</td>
              {gradingScale.map(g => (
                <td key={g.grade} className={`border ${tableBorderColor} px-2 py-1 text-center font-medium`}>{g.label}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ====== COMMENTS & SIGNATURES ====== */}
      <div className={`border ${tableBorderColor} p-3 mb-2 rounded`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-bold text-[10px] underline">Class teacher's Comment:</p>
            <p className="italic text-[10px] mt-1">Satisfactory performance. There is room for improvement.</p>
          </div>
          <div className="text-right ml-4">
            <p className="font-bold text-[10px]">Class Teacher's Signature:</p>
            <div className="h-8 w-24 border-b border-gray-300 mt-1" />
          </div>
        </div>
      </div>

      <div className={`border ${tableBorderColor} p-3 mb-3 rounded`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-bold text-[10px] underline">Headteacher's Comment:</p>
            <p className="italic text-[10px] mt-1">Your performance is satisfactory. I encourage you to put in more effort to reach your full potential.</p>
          </div>
          <div className="text-right ml-4">
            <p className="font-bold text-[10px]">Headteacher's Signature:</p>
            <div className="h-8 w-24 border-b border-gray-300 mt-1" />
          </div>
        </div>
      </div>

      {/* ====== KEY TO TERMS ====== */}
      <div className={`border ${tableBorderColor} p-2 mb-3 text-[8px] rounded`}>
        <p className="font-bold mb-1">Key to terms Used: A1 Average Chapter Assessment 20% End of term assessment</p>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <div><strong>1 - 0.5</strong> - Few LOs achieved, but not<br /><strong>Basic</strong> 1.49 sufficient for overall achievement</div>
          <div><strong>2 - 1.5</strong> - Many LOs achieved,<br /><strong>Moderate</strong> 2.49 enough for overall achievement</div>
          <div><strong>3 - 2.5</strong> - Most or all LOs<br /><strong>Outstanding</strong> 3.0 achieved for overall achievement</div>
        </div>
      </div>

      {/* ====== FOOTER ====== */}
      <div className={`grid grid-cols-5 gap-0 text-[8px] text-center font-bold rounded-b ${footerBg}`}>
        <div className="border border-white/30 p-2">
          <p>08/12/2025</p>
          <p className="uppercase mt-0.5">TERM ENDED ON</p>
        </div>
        <div className="border border-white/30 p-2">
          <p>05/01/2026</p>
          <p className="uppercase mt-0.5">NEXT TERM BEGINS</p>
        </div>
        <div className="border border-white/30 p-2">
          <p>0 UGX</p>
          <p className="uppercase mt-0.5">FEES BALANCE</p>
        </div>
        <div className="border border-white/30 p-2">
          <p>0 UGX</p>
          <p className="uppercase mt-0.5">FEES NEXT TERM</p>
        </div>
        <div className="border border-white/30 p-2">
          <p>&nbsp;</p>
          <p className="uppercase mt-0.5">OTHER REQUIREMENT</p>
        </div>
      </div>
    </div>
  );
};

const TemplatePreviewDialog = ({ open, onOpenChange, templateType, templateName, schoolSettings }: TemplatePreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>Report Card Preview</DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg overflow-hidden shadow-lg">
          <ReportCardPreviewContent schoolSettings={schoolSettings} templateType={templateType} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewDialog;
