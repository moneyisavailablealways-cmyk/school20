import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Move, RotateCcw, Save, Stamp } from 'lucide-react';

export interface StampConfig {
  positionX: number; // percentage 0-100
  positionY: number; // percentage 0-100
  size: string; // 'small' | 'medium' | 'large' | 'custom'
  customScale: number; // 20-200
  opacity: number; // 0-100
  preset: string;
  rotation: number; // degrees
}

const PRESETS: { label: string; value: string; x: number; y: number }[] = [
  { label: 'Top Left', value: 'top-left', x: 10, y: 8 },
  { label: 'Top Right', value: 'top-right', x: 85, y: 8 },
  { label: 'Center', value: 'center', x: 45, y: 45 },
  { label: 'Bottom Left', value: 'bottom-left', x: 10, y: 85 },
  { label: 'Bottom Right', value: 'bottom-right', x: 85, y: 85 },
  { label: 'Near Signature', value: 'near-signature', x: 85, y: 75 },
];

const SIZE_SCALES: Record<string, number> = {
  small: 60,
  medium: 100,
  large: 150,
};

interface StampPositionerProps {
  stampUrl: string;
  config: StampConfig;
  onSave: (config: StampConfig) => void;
  saving?: boolean;
}

const StampPositioner = ({ stampUrl, config, onSave, saving }: StampPositionerProps) => {
  const [localConfig, setLocalConfig] = useState<StampConfig>(config);
  const previewRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setLocalConfig(prev => ({ ...prev, positionX: Math.round(x), positionY: Math.round(y), preset: 'custom' }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setLocalConfig(prev => ({ ...prev, positionX: preset.x, positionY: preset.y, preset: preset.value }));
  };

  const handleReset = () => {
    setLocalConfig({
      positionX: 85, positionY: 75, size: 'medium', customScale: 100,
      opacity: 70, preset: 'near-signature', rotation: -8,
    });
  };

  const effectiveScale = localConfig.size === 'custom' ? localConfig.customScale : (SIZE_SCALES[localConfig.size] || 100);
  const stampPx = Math.round(120 * effectiveScale / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move className="h-5 w-5" />
          Stamp Position & Appearance
        </CardTitle>
        <CardDescription>
          Drag the stamp on the preview or use presets. Settings apply to all report cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Live preview area */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Live Preview (drag to position)</Label>
          <div
            ref={previewRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative border-2 border-dashed border-border rounded-lg bg-white overflow-hidden select-none"
            style={{ height: 360, cursor: isDragging.current ? 'grabbing' : 'default' }}
          >
            {/* Simulated report card background */}
            <div className="absolute inset-0 p-4 text-[8px] text-muted-foreground/40 pointer-events-none">
              <div className="text-center mb-2">
                <div className="w-8 h-8 mx-auto bg-muted rounded-full mb-1" />
                <div className="font-bold text-[10px]">SCHOOL NAME</div>
                <div>Address / Contact</div>
              </div>
              <div className="border-t border-muted-foreground/20 pt-1 mb-2 text-center font-bold text-[9px]">TERM REPORT CARD</div>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {['Name: ___', 'Class: ___', 'Gender: ___'].map(t => <div key={t}>{t}</div>)}
              </div>
              <div className="border border-muted-foreground/20 mb-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex border-b border-muted-foreground/10 last:border-0">
                    <div className="w-6 px-1">{i}</div>
                    <div className="flex-1 px-1">Subject {i}</div>
                    <div className="w-8 text-center">—</div>
                    <div className="w-8 text-center">—</div>
                  </div>
                ))}
              </div>
              <div className="mt-1">Comments: ___</div>
              <div className="mt-8 flex justify-between">
                <div className="text-center"><div className="border-t border-muted-foreground/30 w-16 mt-4" /><div>Class Teacher</div></div>
                <div className="text-center"><div className="border-t border-muted-foreground/30 w-16 mt-4" /><div>Head Teacher</div></div>
              </div>
            </div>

            {/* Draggable stamp */}
            <div
              onMouseDown={handleMouseDown}
              style={{
                position: 'absolute',
                left: `${localConfig.positionX}%`,
                top: `${localConfig.positionY}%`,
                transform: `translate(-50%, -50%) rotate(${localConfig.rotation}deg)`,
                cursor: 'grab',
                zIndex: 20,
                opacity: localConfig.opacity / 100,
                mixBlendMode: 'multiply',
              }}
            >
              <img
                src={stampUrl}
                alt="Stamp"
                draggable={false}
                style={{ width: `${stampPx}px`, height: `${stampPx}px`, objectFit: 'contain', pointerEvents: 'none' }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Position: ({localConfig.positionX}%, {localConfig.positionY}%) | Scale: {effectiveScale}% | Opacity: {localConfig.opacity}%
          </p>
        </div>

        {/* Preset buttons */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Quick Presets</Label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <Button
                key={p.value}
                size="sm"
                variant={localConfig.preset === p.value ? 'default' : 'outline'}
                onClick={() => handlePresetClick(p)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Size</Label>
            <Select value={localConfig.size} onValueChange={v => setLocalConfig(prev => ({ ...prev, size: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {localConfig.size === 'custom' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Custom Scale: {localConfig.customScale}%</Label>
              <Slider
                value={[localConfig.customScale]}
                onValueChange={([v]) => setLocalConfig(prev => ({ ...prev, customScale: v }))}
                min={20} max={200} step={5}
              />
            </div>
          )}
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Opacity: {localConfig.opacity}%</Label>
          <Slider
            value={[localConfig.opacity]}
            onValueChange={([v]) => setLocalConfig(prev => ({ ...prev, opacity: v }))}
            min={10} max={100} step={5}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Watermark</span>
            <span>40% (recommended)</span>
            <span>Solid</span>
          </div>
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Rotation: {localConfig.rotation}°</Label>
          <Slider
            value={[localConfig.rotation]}
            onValueChange={([v]) => setLocalConfig(prev => ({ ...prev, rotation: v }))}
            min={-45} max={45} step={1}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(localConfig)} disabled={saving} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Position'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StampPositioner;
