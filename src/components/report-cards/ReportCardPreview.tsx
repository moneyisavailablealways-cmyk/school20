import { useRef } from 'react';
import { format } from 'date-fns';

interface ReportCardData {
  student: {
    name: string;
    gender: string;
    section: string;
    class: string;
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
  subjects: Array<{
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
  }>;
  summary: {
    overallAvg: number;
    overallGrade: string;
    overallIdentifier: number;
    overallAchievement: string;
    classTeacherComment: string;
    headTeacherComment: string;
  };
  gradingScale: Array<{
    grade: string;
    minScore: number;
    maxScore: number;
  }>;
}

interface ReportCardPreviewProps {
  data: ReportCardData;
}

const ReportCardPreview = ({ data }: ReportCardPreviewProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

  // Calculate averages for the AVERAGE row
  const calculateAverages = () => {
    const subjects = data.subjects;
    if (subjects.length === 0) return null;

    const avgA1 = subjects.filter(s => s.a1 !== null).reduce((sum, s) => sum + (s.a1 || 0), 0) / subjects.filter(s => s.a1 !== null).length || 0;
    const avgA2 = subjects.filter(s => s.a2 !== null).reduce((sum, s) => sum + (s.a2 || 0), 0) / subjects.filter(s => s.a2 !== null).length || 0;
    const avgA3 = subjects.filter(s => s.a3 !== null).reduce((sum, s) => sum + (s.a3 || 0), 0) / subjects.filter(s => s.a3 !== null).length || 0;
    const avgAvg = subjects.filter(s => s.avg !== null).reduce((sum, s) => sum + (s.avg || 0), 0) / subjects.filter(s => s.avg !== null).length || 0;
    const avgCa20 = subjects.filter(s => s.ca20 !== null).reduce((sum, s) => sum + (s.ca20 || 0), 0) / subjects.filter(s => s.ca20 !== null).length || 0;
    const avgExam80 = subjects.filter(s => s.exam80 !== null).reduce((sum, s) => sum + (s.exam80 || 0), 0) / subjects.filter(s => s.exam80 !== null).length || 0;
    const avgTotal = subjects.filter(s => s.total100 !== null).reduce((sum, s) => sum + (s.total100 || 0), 0) / subjects.filter(s => s.total100 !== null).length || 0;

    return {
      avg: avgAvg.toFixed(1),
      ca20: avgCa20.toFixed(1),
      exam80: avgExam80.toFixed(1),
      total: avgTotal.toFixed(1),
    };
  };

  const averages = calculateAverages();

  return (
    <div 
      ref={reportRef}
      className="bg-white text-black p-6 max-w-[210mm] mx-auto shadow-lg"
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}
    >
      {/* Header with logos */}
      <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-3">
        <div className="flex items-start gap-3">
          {data.school.logoUrl && (
            <img 
              src={data.school.logoUrl} 
              alt="School Logo" 
              className="w-16 h-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-xl font-bold uppercase">{data.school.name}</h1>
            <p className="text-xs">{data.school.address}</p>
            <p className="text-xs">TEL: {data.school.phone}</p>
            <p className="text-xs text-blue-600">
              Email: {data.school.email} Website: {data.school.website}
            </p>
          </div>
        </div>
        {data.student.photoUrl && (
          <img 
            src={data.student.photoUrl} 
            alt="Student Photo" 
            className="w-20 h-24 object-cover border"
          />
        )}
      </div>

      {/* Report Card Title */}
      <h2 className="text-center text-lg font-bold my-3 uppercase border-b border-black pb-2">
        {data.term.name.toUpperCase()} REPORT CARD {data.term.year}
      </h2>

      {/* Student Info Grid */}
      <div className="grid grid-cols-2 gap-x-8 text-xs mb-3 border-b border-black pb-2">
        <div className="grid grid-cols-2 gap-1">
          <span className="font-bold">NAME:</span>
          <span className="uppercase">{data.student.name}</span>
          <span className="font-bold">SECTION:</span>
          <span>{data.student.section}</span>
          <span className="font-bold">House:</span>
          <span className="font-bold">{data.student.house}</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <span className="font-bold">GENDER:</span>
          <span className="uppercase">{data.student.gender}</span>
          <span className="font-bold">CLASS:</span>
          <span>{data.student.class}</span>
          <span className="font-bold">TERM:</span>
          <span className="uppercase">{data.term.name.replace('Term ', '')}</span>
        </div>
        <div></div>
        <div className="text-right">
          <span className="font-bold">Age: </span>
          <span>{data.student.age}</span>
          <span className="ml-4 font-bold">Printed on </span>
          <span className="text-yellow-600">{data.term.printedDate}</span>
        </div>
      </div>

      {/* Performance Records */}
      <h3 className="text-center font-bold text-sm bg-yellow-100 py-1 mb-2 uppercase">
        Performance Records
      </h3>

      <table className="w-full border-collapse text-xs mb-3">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-1 py-0.5 text-left">Code</th>
            <th className="border border-gray-400 px-1 py-0.5 text-left">Subject</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">A1</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">A2</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">A3</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">AVG</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">20%</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">80%</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">100%</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">Ident</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">GRADE</th>
            <th className="border border-gray-400 px-1 py-0.5 text-left">Remarks/Descriptors</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">TR</th>
          </tr>
        </thead>
        <tbody>
          {data.subjects.map((subject, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-400 px-1 py-0.5 font-bold">{subject.code}</td>
              <td className="border border-gray-400 px-1 py-0.5 font-bold">{subject.name}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.a1?.toFixed(1) ?? ''}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.a2?.toFixed(1) ?? ''}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.a3?.toFixed(1) ?? ''}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.avg?.toFixed(1) ?? ''}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.ca20?.toFixed(1) ?? ''}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.exam80?.toFixed(1) ?? ''}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.total100?.toFixed(1) ?? ''}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.identifier}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center font-bold">{subject.grade}</td>
              <td className="border border-gray-400 px-1 py-0.5">{subject.remark}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{subject.teacherInitials}</td>
            </tr>
          ))}
          {/* Average Row */}
          {averages && (
            <tr className="bg-gray-200 font-bold">
              <td className="border border-gray-400 px-1 py-0.5" colSpan={3}>AVERAGE:</td>
              <td className="border border-gray-400 px-1 py-0.5"></td>
              <td className="border border-gray-400 px-1 py-0.5"></td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{averages.avg}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{averages.ca20}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{averages.exam80}</td>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{averages.total}</td>
              <td className="border border-gray-400 px-1 py-0.5" colSpan={4}></td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="grid grid-cols-4 gap-2 text-xs mb-2">
        <div className="border border-gray-400 p-1">
          <span className="font-bold">Overall Identifier</span>
          <p className="text-center text-lg font-bold">{data.summary.overallIdentifier}</p>
        </div>
        <div className="border border-gray-400 p-1">
          <span className="font-bold">Overall Achievement</span>
          <p className="text-center font-semibold">{data.summary.overallAchievement}</p>
        </div>
        <div className="border border-gray-400 p-1">
          <span className="font-bold">Overall grade</span>
          <p className="text-center text-lg font-bold">{data.summary.overallGrade}</p>
        </div>
        <div className="border border-gray-400 p-1">
          <span className="font-bold">Average</span>
          <p className="text-center text-lg font-bold">{data.summary.overallAvg.toFixed(1)}%</p>
        </div>
      </div>

      {/* Grade Scale */}
      <table className="w-full border-collapse text-xs mb-3">
        <tbody>
          <tr className="bg-gray-100">
            <td className="border border-gray-400 px-2 py-1 font-bold">GRADE</td>
            {data.gradingScale.map((g, idx) => (
              <td key={idx} className="border border-gray-400 px-2 py-1 text-center font-bold">
                {g.grade}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-bold">SCORES</td>
            {data.gradingScale.map((g, idx) => (
              <td key={idx} className="border border-gray-400 px-2 py-1 text-center">
                {g.maxScore} - {g.minScore}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Comments Section */}
      <div className="text-xs mb-3 space-y-2">
        <div className="border border-gray-400 p-2">
          <span className="font-bold">Class teacher's Comment: </span>
          <span className="italic">{data.summary.classTeacherComment || 'No comment'}</span>
        </div>
        <div className="border border-gray-400 p-2">
          <span className="font-bold">Headteacher's Comment: </span>
          <span className="italic">{data.summary.headTeacherComment || 'No comment'}</span>
        </div>
      </div>

      {/* Key to Terms Used */}
      <div className="border border-gray-400 p-2 text-xs mb-3">
        <p className="font-bold mb-1">Key to Terms Used:</p>
        <div className="grid grid-cols-2 gap-x-4">
          <p><strong>A1</strong> Average Chapter Assessment <strong>80%</strong> End of term assessment</p>
          <p></p>
          <p><strong>1 - Basic</strong> 0.9-1.49 Few LOs achieved, but not sufficient for overall achievement</p>
          <p><strong>2 - Moderate</strong> 1.5-2.49 Many LOs achieved, enough for overall achievement</p>
          <p><strong>3 - Outstanding</strong> 2.5-3.0 Most or all LOs achieved for overall achievement</p>
        </div>
      </div>

      {/* Footer Section */}
      <div className="grid grid-cols-5 gap-2 text-xs border border-gray-400">
        <div className="border-r border-gray-400 p-2">
          <p className="font-bold">TERM ENDED ON</p>
          <p>{data.term.endDate || '-'}</p>
        </div>
        <div className="border-r border-gray-400 p-2">
          <p className="font-bold">NEXT TERM BEGINS</p>
          <p>{data.term.nextTermStart || '-'}</p>
        </div>
        <div className="border-r border-gray-400 p-2">
          <p className="font-bold">FEES BALANCE</p>
          <p>{data.term.feesBalance || '-'}</p>
        </div>
        <div className="border-r border-gray-400 p-2">
          <p className="font-bold">FEES NEXT TERM</p>
          <p>{data.term.feesNextTerm || '-'}</p>
        </div>
        <div className="p-2">
          <p className="font-bold italic">Other Requirement</p>
          <p>{data.term.otherRequirements || '-'}</p>
        </div>
      </div>

      {/* Footer Motto */}
      <p className="text-center italic font-semibold text-red-600 mt-4">
        {data.school.footerMotto}
      </p>
    </div>
  );
};

export default ReportCardPreview;