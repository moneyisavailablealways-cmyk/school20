import DigitalSignatureManager from './DigitalSignatureManager';
import SchoolStampManager from './SchoolStampManager';

const SignaturesStamps = () => {
  return (
    <div className="space-y-6">
      <DigitalSignatureManager />
      <SchoolStampManager />
    </div>
  );
};

export default SignaturesStamps;
