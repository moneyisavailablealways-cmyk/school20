import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check } from 'lucide-react';

const SIGNATURE_FONTS = [
  { value: 'Dancing Script', label: 'Dancing Script' },
  { value: 'Great Vibes', label: 'Great Vibes' },
  { value: 'Pacifico', label: 'Pacifico' },
  { value: 'Sacramento', label: 'Sacramento' },
  { value: 'Allura', label: 'Allura' },
];

interface TypeToSignProps {
  onSave: (text: string, fontFamily: string, imageData: string) => void;
  initialText?: string;
  initialFont?: string;
}

const TypeToSign = ({ onSave, initialText = '', initialFont = 'Dancing Script' }: TypeToSignProps) => {
  const [text, setText] = useState(initialText);
  const [font, setFont] = useState(initialFont);

  const generateSignatureImage = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = `36px "${font}", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  const handleSave = () => {
    if (!text.trim()) return;
    const imageData = generateSignatureImage();
    onSave(text, font, imageData);
  };

  return (
    <div className="space-y-4">
      {/* Load Google Fonts */}
      <link
        href={`https://fonts.googleapis.com/css2?family=${SIGNATURE_FONTS.map(f => f.value.replace(/ /g, '+')).join('&family=')}&display=swap`}
        rel="stylesheet"
      />

      <div className="space-y-2">
        <Label>Type your name</Label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your full name"
          className="text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label>Choose signature style</Label>
        <Select value={font} onValueChange={setFont}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIGNATURE_FONTS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                <span style={{ fontFamily: `"${f.value}", cursive` }}>{f.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {text && (
        <div className="border-2 border-dashed border-border rounded-lg p-6 bg-card text-center">
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <p
            style={{ fontFamily: `"${font}", cursive`, fontSize: '36px', color: 'hsl(var(--foreground))' }}
          >
            {text}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={!text.trim()}>
          <Check className="mr-1 h-3.5 w-3.5" />
          Save Signature
        </Button>
      </div>
    </div>
  );
};

export default TypeToSign;
