import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
  { name: 'Mathematics', a1: 78, a2: 82, a3: 80, ca20: 16, exam80: 68, total: 84, identifier: 3, grade: 'D1', remark: 'Outstanding' },
  { name: 'English Language', a1: 65, a2: 70, a3: 68, ca20: 13.5, exam80: 58, total: 71.5, identifier: 2, grade: 'C4', remark: 'Moderate' },
  { name: 'Physics', a1: 88, a2: 90, a3: 85, ca20: 17.5, exam80: 74, total: 91.5, identifier: 3, grade: 'D1', remark: 'Outstanding' },
  { name: 'Chemistry', a1: 55, a2: 60, a3: 58, ca20: 11.5, exam80: 50, total: 61.5, identifier: 2, grade: 'C5', remark: 'Moderate' },
  { name: 'Biology', a1: 72, a2: 75, a3: 70, ca20: 14.5, exam80: 60, total: 74.5, identifier: 2, grade: 'C3', remark: 'Moderate' },
  { name: 'History', a1: 80, a2: 85, a3: 82, ca20: 16.5, exam80: 66, total: 82.5, identifier: 3, grade: 'D2', remark: 'Outstanding' },
];

const ClassicPreview = ({ schoolSettings }: { schoolSettings: TemplatePreviewDialogProps['schoolSettings'] }) => (
  <div className="bg-white text-black p-6 border-2 border-border" style={{ fontFamily: 'Times New Roman, serif', fontSize: '11px' }}>
    <div className="text-center border-b-2 border-black pb-3 mb-4">
      {schoolSettings?.logo_url ? (
        <img src={schoolSettings.logo_url} alt="Logo" className="h-14 w-14 mx-auto mb-1 object-contain" />
      ) : (
        <div className="w-14 h-14 bg-muted rounded-full mx-auto mb-1 flex items-center justify-center"><Building2 className="h-7 w-7 text-muted-foreground" /></div>
      )}
      <h2 className="text-lg font-bold uppercase">{schoolSettings?.school_name || 'Sample School Name'}</h2>
      {schoolSettings?.motto && <p className="text-xs italic">"{schoolSettings.motto}"</p>}
      <p className="text-xs text-muted-foreground">{schoolSettings?.address || 'P.O. Box 123, Kampala'}</p>
      <h3 className="text-sm font-bold mt-2 uppercase tracking-wider">Student Report Card</h3>
    </div>
    <div className="grid grid-cols-2 gap-4 text-xs mb-3 border-b border-black pb-2">
      <div><strong>Name:</strong> NAMUKASA FAITH</div>
      <div><strong>Class:</strong> S.2 BLUE</div>
      <div><strong>Adm No:</strong> STU-2024-001</div>
      <div><strong>Term:</strong> Term I, 2026</div>
    </div>
    <table className="w-full border-collapse text-xs mb-3">
      <thead>
        <tr className="bg-gray-200">
          <th className="border border-black px-1 py-1 text-left">Subject</th>
          <th className="border border-black px-1 py-1 text-center">A1</th>
          <th className="border border-black px-1 py-1 text-center">A2</th>
          <th className="border border-black px-1 py-1 text-center">A3</th>
          <th className="border border-black px-1 py-1 text-center">20%</th>
          <th className="border border-black px-1 py-1 text-center">80%</th>
          <th className="border border-black px-1 py-1 text-center">Total</th>
          <th className="border border-black px-1 py-1 text-center">Grade</th>
          <th className="border border-black px-1 py-1 text-left">Remark</th>
        </tr>
      </thead>
      <tbody>
        {sampleSubjects.map((s, i) => (
          <tr key={i}>
            <td className="border border-black px-1 py-0.5 font-semibold">{s.name}</td>
            <td className="border border-black px-1 py-0.5 text-center">{s.a1}</td>
            <td className="border border-black px-1 py-0.5 text-center">{s.a2}</td>
            <td className="border border-black px-1 py-0.5 text-center">{s.a3}</td>
            <td className="border border-black px-1 py-0.5 text-center">{s.ca20}</td>
            <td className="border border-black px-1 py-0.5 text-center">{s.exam80}</td>
            <td className="border border-black px-1 py-0.5 text-center font-bold">{s.total}</td>
            <td className="border border-black px-1 py-0.5 text-center font-bold">{s.grade}</td>
            <td className="border border-black px-1 py-0.5">{s.remark}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="grid grid-cols-3 gap-3 text-center text-xs mb-3">
      <div className="border border-black p-2"><strong>Average:</strong> <span className="text-lg font-bold">77.6</span></div>
      <div className="border border-black p-2"><strong>Grade:</strong> <span className="text-lg font-bold">C3</span></div>
      <div className="border border-black p-2"><strong>Identifier:</strong> <span className="text-lg font-bold">2</span></div>
    </div>
    <div className="text-xs space-y-1">
      <div className="border border-black p-2"><strong>Class Teacher:</strong> <em>A dedicated student with consistent performance. Keep it up!</em></div>
      <div className="border border-black p-2"><strong>Head Teacher:</strong> <em>Good progress this term. We encourage further improvement.</em></div>
    </div>
  </div>
);

const ModernPreview = ({ schoolSettings }: { schoolSettings: TemplatePreviewDialogProps['schoolSettings'] }) => (
  <div className="bg-white text-black p-6" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '11px' }}>
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-t-lg mb-4">
      <div className="flex items-center gap-3">
        {schoolSettings?.logo_url ? (
          <img src={schoolSettings.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded bg-white p-1" />
        ) : (
          <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center"><Building2 className="h-6 w-6 text-white" /></div>
        )}
        <div>
          <h2 className="text-lg font-bold">{schoolSettings?.school_name || 'Sample School Name'}</h2>
          {schoolSettings?.motto && <p className="text-xs opacity-80">"{schoolSettings.motto}"</p>}
        </div>
      </div>
      <h3 className="text-center text-sm font-semibold mt-2 tracking-wide">📊 STUDENT REPORT CARD</h3>
    </div>
    <div className="grid grid-cols-2 gap-3 text-xs mb-4">
      <div className="bg-blue-50 p-2 rounded"><strong>Name:</strong> NAMUKASA FAITH</div>
      <div className="bg-blue-50 p-2 rounded"><strong>Class:</strong> S.2 BLUE</div>
      <div className="bg-blue-50 p-2 rounded"><strong>Adm No:</strong> STU-2024-001</div>
      <div className="bg-blue-50 p-2 rounded"><strong>Term:</strong> Term I, 2026</div>
    </div>
    <table className="w-full border-collapse text-xs mb-4">
      <thead>
        <tr className="bg-blue-600 text-white">
          <th className="px-2 py-1.5 text-left rounded-tl">Subject</th>
          <th className="px-2 py-1.5 text-center">CA (20%)</th>
          <th className="px-2 py-1.5 text-center">Exam (80%)</th>
          <th className="px-2 py-1.5 text-center">Total</th>
          <th className="px-2 py-1.5 text-center">Grade</th>
          <th className="px-2 py-1.5 text-left rounded-tr">Remark</th>
        </tr>
      </thead>
      <tbody>
        {sampleSubjects.map((s, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}>
            <td className="px-2 py-1 font-medium">{s.name}</td>
            <td className="px-2 py-1 text-center">{s.ca20}</td>
            <td className="px-2 py-1 text-center">{s.exam80}</td>
            <td className="px-2 py-1 text-center font-bold">{s.total}</td>
            <td className="px-2 py-1 text-center">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.identifier === 3 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.grade}</span>
            </td>
            <td className="px-2 py-1">{s.remark}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-3 rounded-lg text-center">
        <p className="text-2xl font-bold">77.6</p><p className="text-[10px] opacity-80">Average</p>
      </div>
      <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-3 rounded-lg text-center">
        <p className="text-2xl font-bold">C3</p><p className="text-[10px] opacity-80">Grade</p>
      </div>
      <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-3 rounded-lg text-center">
        <p className="text-2xl font-bold">2</p><p className="text-[10px] opacity-80">Identifier</p>
      </div>
    </div>
    <div className="text-xs space-y-2">
      <div className="bg-blue-50 p-2 rounded-lg border-l-4 border-blue-500"><strong>Class Teacher:</strong> <em>A dedicated student with consistent performance.</em></div>
      <div className="bg-green-50 p-2 rounded-lg border-l-4 border-green-500"><strong>Head Teacher:</strong> <em>Good progress this term.</em></div>
    </div>
  </div>
);

const MinimalPreview = ({ schoolSettings }: { schoolSettings: TemplatePreviewDialogProps['schoolSettings'] }) => (
  <div className="bg-white text-black p-8" style={{ fontFamily: 'Georgia, serif', fontSize: '11px' }}>
    <div className="text-center mb-6">
      <h2 className="text-lg font-light tracking-[0.3em] uppercase">{schoolSettings?.school_name || 'Sample School Name'}</h2>
      <div className="w-16 h-px bg-black mx-auto my-2" />
      <p className="text-xs tracking-wider uppercase text-gray-500">Student Report Card</p>
    </div>
    <div className="grid grid-cols-2 gap-6 text-xs mb-6">
      <div><span className="text-gray-400 uppercase text-[10px]">Student</span><p className="font-medium">Namukasa Faith</p></div>
      <div><span className="text-gray-400 uppercase text-[10px]">Class</span><p className="font-medium">S.2 Blue</p></div>
      <div><span className="text-gray-400 uppercase text-[10px]">Admission No</span><p className="font-medium">STU-2024-001</p></div>
      <div><span className="text-gray-400 uppercase text-[10px]">Term</span><p className="font-medium">Term I, 2026</p></div>
    </div>
    <table className="w-full text-xs mb-6">
      <thead>
        <tr className="border-b-2 border-black">
          <th className="py-2 text-left font-normal text-gray-500">Subject</th>
          <th className="py-2 text-center font-normal text-gray-500">Score</th>
          <th className="py-2 text-center font-normal text-gray-500">Grade</th>
          <th className="py-2 text-left font-normal text-gray-500">Remark</th>
        </tr>
      </thead>
      <tbody>
        {sampleSubjects.map((s, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="py-2">{s.name}</td>
            <td className="py-2 text-center">{s.total}</td>
            <td className="py-2 text-center font-medium">{s.grade}</td>
            <td className="py-2 text-gray-500">{s.remark}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="flex justify-between text-xs border-t border-b border-black py-3 mb-6">
      <div><span className="text-gray-400">Average</span><p className="text-xl font-light">77.6</p></div>
      <div className="text-center"><span className="text-gray-400">Grade</span><p className="text-xl font-light">C3</p></div>
      <div className="text-right"><span className="text-gray-400">Identifier</span><p className="text-xl font-light">2</p></div>
    </div>
    <div className="text-xs space-y-3">
      <div><p className="text-gray-400 text-[10px] uppercase mb-0.5">Class Teacher</p><p className="italic">A dedicated student with consistent performance.</p></div>
      <div><p className="text-gray-400 text-[10px] uppercase mb-0.5">Head Teacher</p><p className="italic">Good progress this term.</p></div>
    </div>
  </div>
);

const ColorfulPreview = ({ schoolSettings }: { schoolSettings: TemplatePreviewDialogProps['schoolSettings'] }) => (
  <div className="bg-white text-black p-6" style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif', fontSize: '11px' }}>
    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white p-4 rounded-2xl mb-4 text-center">
      {schoolSettings?.logo_url ? (
        <img src={schoolSettings.logo_url} alt="Logo" className="h-12 w-12 mx-auto mb-1 object-contain rounded-full bg-white p-1" />
      ) : (
        <div className="w-12 h-12 bg-white/20 rounded-full mx-auto mb-1 flex items-center justify-center"><Building2 className="h-6 w-6" /></div>
      )}
      <h2 className="text-lg font-bold">{schoolSettings?.school_name || 'Sample School Name'} 🏫</h2>
      <p className="text-sm font-semibold mt-1">⭐ Report Card ⭐</p>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
      <div className="bg-purple-50 p-2 rounded-xl border border-purple-200">📝 <strong>Name:</strong> Namukasa Faith</div>
      <div className="bg-pink-50 p-2 rounded-xl border border-pink-200">📚 <strong>Class:</strong> S.2 Blue</div>
      <div className="bg-orange-50 p-2 rounded-xl border border-orange-200">🔢 <strong>Adm No:</strong> STU-2024-001</div>
      <div className="bg-yellow-50 p-2 rounded-xl border border-yellow-200">📅 <strong>Term:</strong> Term I, 2026</div>
    </div>
    <table className="w-full border-collapse text-xs mb-3">
      <thead>
        <tr className="bg-gradient-to-r from-purple-400 to-pink-400 text-white">
          <th className="px-2 py-1.5 text-left rounded-tl-lg">Subject</th>
          <th className="px-2 py-1.5 text-center">Score</th>
          <th className="px-2 py-1.5 text-center">Grade</th>
          <th className="px-2 py-1.5 text-left rounded-tr-lg">Remark</th>
        </tr>
      </thead>
      <tbody>
        {sampleSubjects.map((s, i) => {
          const colors = ['bg-purple-50', 'bg-pink-50', 'bg-orange-50', 'bg-yellow-50', 'bg-green-50', 'bg-blue-50'];
          return (
            <tr key={i} className={colors[i % colors.length]}>
              <td className="px-2 py-1 font-medium">{s.name}</td>
              <td className="px-2 py-1 text-center font-bold">{s.total}</td>
              <td className="px-2 py-1 text-center">
                <span className="bg-white px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">{s.grade}</span>
              </td>
              <td className="px-2 py-1">{s.identifier === 3 ? '🌟 ' : '👍 '}{s.remark}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="bg-gradient-to-br from-purple-400 to-purple-600 text-white p-3 rounded-2xl text-center">
        <p className="text-2xl font-bold">77.6</p><p className="text-[10px]">Average 📊</p>
      </div>
      <div className="bg-gradient-to-br from-pink-400 to-pink-600 text-white p-3 rounded-2xl text-center">
        <p className="text-2xl font-bold">C3</p><p className="text-[10px]">Grade 🎯</p>
      </div>
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white p-3 rounded-2xl text-center">
        <p className="text-2xl font-bold">2</p><p className="text-[10px]">Identifier ✨</p>
      </div>
    </div>
    <div className="text-xs space-y-2">
      <div className="bg-purple-50 p-2 rounded-xl border border-purple-200">💬 <strong>Class Teacher:</strong> <em>A dedicated student with consistent performance!</em></div>
      <div className="bg-pink-50 p-2 rounded-xl border border-pink-200">💬 <strong>Head Teacher:</strong> <em>Good progress this term. Keep shining!</em></div>
    </div>
  </div>
);

const TemplatePreviewDialog = ({ open, onOpenChange, templateType, templateName, schoolSettings }: TemplatePreviewDialogProps) => {
  const renderPreview = () => {
    switch (templateType) {
      case 'classic': return <ClassicPreview schoolSettings={schoolSettings} />;
      case 'modern': return <ModernPreview schoolSettings={schoolSettings} />;
      case 'minimal': return <MinimalPreview schoolSettings={schoolSettings} />;
      case 'colorful': return <ColorfulPreview schoolSettings={schoolSettings} />;
      default: return <ClassicPreview schoolSettings={schoolSettings} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview: {templateName}</DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg overflow-hidden">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewDialog;
