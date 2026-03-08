import ClassicTemplate from './templates/ClassicTemplate';
import ModernTemplate from './templates/ModernTemplate';
import MinimalTemplate from './templates/MinimalTemplate';
import ColorfulTemplate from './templates/ColorfulTemplate';

interface ReportCardPreviewProps {
  data: any;
}

const ReportCardPreview = ({ data }: ReportCardPreviewProps) => {
  if (!data) return null;

  const templateType = data.templateType || 'classic';

  switch (templateType) {
    case 'modern':
      return <ModernTemplate data={data} />;
    case 'minimal':
      return <MinimalTemplate data={data} />;
    case 'colorful':
      return <ColorfulTemplate data={data} />;
    case 'classic':
    default:
      return <ClassicTemplate data={data} />;
  }
};

export default ReportCardPreview;
