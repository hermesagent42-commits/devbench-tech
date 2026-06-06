'use client';

import { useState, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Upload, Copy, Camera, Image as ImageIcon, MapPin, Calendar, Settings, Maximize2, FileText, Info, AlertCircle, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ───────────────────────────────────────────────────────────────────

interface ExifEntry {
  tag: string;
  value: string;
  description: string;
}

interface ExifGroup {
  name: string;
  entries: ExifEntry[];
}

// ── EXIF Tag Registry ──────────────────────────────────────────────────────

const TAG_NAMES: Record<number, string> = {
  0x010F: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011A: 'XResolution',
  0x011B: 'YResolution',
  0x0128: 'ResolutionUnit',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x013B: 'Artist',
  0x013E: 'WhitePoint',
  0x013F: 'PrimaryChromaticities',
  0x0201: 'JPEGInterchangeFormat',
  0x0202: 'JPEGInterchangeFormatLength',
  0x0211: 'YCbCrCoefficients',
  0x0213: 'YCbCrPositioning',
  0x0214: 'ReferenceBlackWhite',
  0x8298: 'Copyright',
  0x829A: 'ExposureTime',
  0x829D: 'FNumber',
  0x8822: 'ExposureProgram',
  0x8824: 'SpectralSensitivity',
  0x8827: 'ISOSpeedRatings',
  0x8828: 'OECF',
  0x8830: 'SensitivityType',
  0x8832: 'RecommendedExposureIndex',
  0x9000: 'ExifVersion',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x9101: 'ComponentsConfiguration',
  0x9102: 'CompressedBitsPerPixel',
  0x9201: 'ShutterSpeedValue',
  0x9202: 'ApertureValue',
  0x9203: 'BrightnessValue',
  0x9204: 'ExposureBiasValue',
  0x9205: 'MaxApertureValue',
  0x9206: 'SubjectDistance',
  0x9207: 'MeteringMode',
  0x9208: 'LightSource',
  0x9209: 'Flash',
  0x920A: 'FocalLength',
  0x9214: 'SubjectArea',
  0x927C: 'MakerNote',
  0x9286: 'UserComment',
  0x9290: 'SubSecTime',
  0x9291: 'SubSecTimeOriginal',
  0x9292: 'SubSecTimeDigitized',
  0xA000: 'FlashpixVersion',
  0xA001: 'ColorSpace',
  0xA002: 'PixelXDimension',
  0xA003: 'PixelYDimension',
  0xA004: 'RelatedSoundFile',
  0xA005: 'InteroperabilityIFD',
  0xA20E: 'FocalPlaneXResolution',
  0xA20F: 'FocalPlaneYResolution',
  0xA210: 'FocalPlaneResolutionUnit',
  0xA217: 'SensingMethod',
  0xA300: 'FileSource',
  0xA301: 'SceneType',
  0xA401: 'CustomRendered',
  0xA402: 'ExposureMode',
  0xA403: 'WhiteBalance',
  0xA404: 'DigitalZoomRatio',
  0xA405: 'FocalLengthIn35mmFilm',
  0xA406: 'SceneCaptureType',
  0xA407: 'GainControl',
  0xA408: 'Contrast',
  0xA409: 'Saturation',
  0xA40A: 'Sharpness',
  0xA40C: 'SubjectDistanceRange',
  0xA420: 'ImageUniqueID',
  0xA430: 'CameraOwnerName',
  0xA431: 'BodySerialNumber',
  0xA432: 'LensSpecification',
  0xA433: 'LensMake',
  0xA434: 'LensModel',
  0xA435: 'LensSerialNumber',
};

const GPS_TAG_NAMES: Record<number, string> = {
  0x0000: 'GPSVersionID',
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp',
  0x0012: 'GPSMapDatum',
  0x001D: 'GPSDateStamp',
};

const ORIENTATIONS: Record<number, string> = {
  1: 'Normal (top-left)',
  2: 'Mirrored horizontally',
  3: 'Rotated 180°',
  4: 'Mirrored vertically',
  5: 'Mirrored horizontally, rotated 270° CW',
  6: 'Rotated 90° CW',
  7: 'Mirrored horizontally, rotated 90° CW',
  8: 'Rotated 270° CW',
};

const FLASH_VALUES: Record<number, string> = {
  0x00: 'No Flash',
  0x01: 'Fired',
  0x05: 'Fired, return not detected',
  0x07: 'Fired, return detected',
  0x09: 'On, not fired',
  0x0D: 'On, return not detected',
  0x0F: 'On, return detected',
  0x10: 'Off',
  0x18: 'Auto, not fired',
  0x19: 'Auto, fired',
  0x1D: 'Auto, fired, return not detected',
  0x1F: 'Auto, fired, return detected',
  0x20: 'No flash function',
  0x41: 'Red-eye reduction',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function readUint16(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint16(offset, littleEndian);
}

function readUint32(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint32(offset, littleEndian);
}

function readRational(view: DataView, offset: number, littleEndian: boolean): [number, number] {
  const num = readUint32(view, offset, littleEndian);
  const den = readUint32(view, offset + 4, littleEndian);
  return [num, den];
}

function formatRational(num: number, den: number): string {
  if (den === 0) return '∞';
  const val = num / den;
  if (Number.isInteger(val)) return val.toString();
  return val.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function readString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    str += String.fromCharCode(c);
  }
  return str;
}

function formatGPSRational(num: number, den: number): string {
  if (den === 0) return '0';
  return (num / den).toFixed(6);
}

function formatGPSCoordinate(rationals: [number, number][]): string {
  if (rationals.length < 3) return '';
  const deg = rationals[0][0] / rationals[0][1];
  const min = rationals[1][0] / rationals[1][1];
  const sec = rationals[2][0] / rationals[2][1];
  return `${deg.toFixed(0)}° ${min.toFixed(0)}' ${sec.toFixed(2)}"`;
}

// ── Main Parser ────────────────────────────────────────────────────────────

function parseExif(buffer: ArrayBuffer): ExifGroup[] {
  const view = new DataView(buffer);
  const groups: ExifGroup[] = [];

  // Find EXIF marker (0xFFE1)
  let offset = 0;
  if (view.getUint16(0) !== 0xFFD8) {
    throw new Error('Not a valid JPEG file');
  }

  offset = 2;
  while (offset < buffer.byteLength - 4) {
    const marker = view.getUint16(offset);
    if (marker === 0xFFE1) {
      // EXIF segment found
      const segLen = view.getUint16(offset + 2);
      const exifStart = offset + 4;

      // Check "Exif\0\0" header
      const header = readString(view, exifStart, 6);
      if (header !== 'Exif\x00\x00') {
        throw new Error('Invalid EXIF header');
      }

      const tiffOffset = exifStart + 6;

      // Read byte order
      const byteOrder = view.getUint16(tiffOffset);
      const littleEndian = byteOrder === 0x4949; // II = Intel (little endian)

      // Verify TIFF magic
      const magic = view.getUint16(tiffOffset + 2, littleEndian);
      if (magic !== 0x002A) {
        throw new Error('Invalid TIFF header');
      }

      // First IFD offset
      let ifdOffset = tiffOffset + readUint32(view, tiffOffset + 4, littleEndian);

      // Read IFD0 (main image)
      const mainEntries = readIFD(view, ifdOffset, littleEndian, TAG_NAMES);
      if (mainEntries.length > 0) {
        groups.push({ name: 'Camera & Image', entries: mainEntries });
      }

      // Parse Exif IFD (sub-IFD)
      const exifIfdOffsetTag = mainEntries.find(e => e.tag === 'ExifIFDPointer');
      if (exifIfdOffsetTag) {
        const exifOffset = parseInt(exifIfdOffsetTag.value);
        if (exifOffset > 0) {
          const exifEntries = readIFD(view, tiffOffset + exifOffset, littleEndian, TAG_NAMES);
          if (exifEntries.length > 0) {
            groups.push({ name: 'Exposure & Capture', entries: exifEntries });
          }
        }
      }

      // Parse GPS IFD
      const gpsIfdOffsetTag = mainEntries.find(e => e.tag === 'GPSInfoIFDPointer');
      if (gpsIfdOffsetTag) {
        const gpsOffset = parseInt(gpsIfdOffsetTag.value);
        if (gpsOffset > 0) {
          const gpsEntries = readIFD(view, tiffOffset + gpsOffset, littleEndian, GPS_TAG_NAMES);
          if (gpsEntries.length > 0) {
            groups.push({ name: 'GPS Location', entries: gpsEntries });
          }
        }
      }

      break;
    }

    // Skip to next marker
    const segLen = view.getUint16(offset + 2);
    offset += 2 + segLen;
  }

  return groups;
}

function readIFD(view: DataView, ifdOffset: number, littleEndian: boolean, tagNames: Record<number, string>): ExifEntry[] {
  if (ifdOffset <= 0 || ifdOffset >= view.byteLength) return [];

  const numEntries = view.getUint16(ifdOffset, littleEndian);
  const entries: ExifEntry[] = [];

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;

    const tagName = tagNames[tag] || `Unknown (0x${tag.toString(16).toUpperCase()})`;
    const value = readTagValue(view, valueOffset, type, count, littleEndian);

    entries.push({ tag: tagName, value, description: '' });
  }

  return entries;
}

function readTagValue(view: DataView, offset: number, type: number, count: number, littleEndian: boolean): string {
  const totalBytes = getTypeSize(type) * count;

  // If value fits in 4 bytes, it's stored inline
  const dataOffset = totalBytes <= 4 ? offset : readUint32(view, offset, littleEndian);

  if (dataOffset + totalBytes > view.byteLength) return '[out of bounds]';

  switch (type) {
    case 1: // BYTE
      return Array.from({ length: count }, (_, i) => view.getUint8(dataOffset + i)).join(', ');

    case 2: // ASCII
      return readString(view, dataOffset, Math.min(count, 256));

    case 3: // SHORT
      return Array.from({ length: Math.min(count, 8) }, (_, i) =>
        view.getUint16(dataOffset + i * 2, littleEndian).toString()
      ).join(', ') + (count > 8 ? ` +${count - 8} more` : '');

    case 4: // LONG
      return Array.from({ length: Math.min(count, 4) }, (_, i) =>
        readUint32(view, dataOffset + i * 4, littleEndian).toString()
      ).join(', ') + (count > 4 ? ` +${count - 4} more` : '');

    case 5: { // RATIONAL
      const [num, den] = readRational(view, dataOffset, littleEndian);
      return formatRational(num, den) + (count > 1 ? ` (${count} values)` : '');
    }

    case 7: // UNDEFINED
      return `[${count} bytes]`;

    case 9: // SLONG
      return view.getInt32(dataOffset, littleEndian).toString();

    case 10: { // SRATIONAL
      const n = view.getInt32(dataOffset, littleEndian);
      const d = view.getInt32(dataOffset + 4, littleEndian);
      return formatRational(n, d);
    }

    default:
      return `[type ${type}, ${count} values]`;
  }
}

function getTypeSize(type: number): number {
  switch (type) {
    case 1: case 2: case 7: return 1;
    case 3: return 2;
    case 4: case 9: return 4;
    case 5: case 10: return 8;
    default: return 0;
  }
}

// ── Descriptive labels ──────────────────────────────────────────────────────

function getDescription(tag: string, value: string): string {
  if (tag === 'Orientation') {
    const v = parseInt(value.split(',')[0]);
    return ORIENTATIONS[v] || '';
  }
  if (tag === 'Flash') {
    const v = parseInt(value.split(',')[0]);
    return FLASH_VALUES[v] || '';
  }
  return '';
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ExifMetadataViewer() {
  const [groups, setGroups] = useState<ExifGroup[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setGroups([]);
    setImageUrl(null);
    setFileName(file.name);
    setFileSize(file.size);
    setImageDims(null);

    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/jpg')) {
      setError('EXIF metadata is primarily found in JPEG files. Other formats (PNG, WebP, etc.) may not contain EXIF data.');
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Read file as ArrayBuffer for EXIF parsing
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExif(buffer);

      // Add descriptions
      const enriched = parsed.map(g => ({
        ...g,
        entries: g.entries.map(e => ({ ...e, description: getDescription(e.tag, e.value) })),
      }));

      setGroups(enriched);

      // Get image dimensions from the loaded image
      const img = new Image();
      img.onload = () => {
        setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = url;
    } catch (err: any) {
      if (groups.length === 0) {
        setError(err.message || 'Failed to parse EXIF data');
      }
    }
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const copyEntry = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  }, []);

  return (
    <ToolLayout
      title="EXIF Metadata Viewer"
      description="Extract and view EXIF metadata from JPEG photos — camera settings, GPS coordinates, timestamps, lens info, and more. 100% client-side, no upload to servers."
    >
      {/* Upload Area */}
      {!imageUrl && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            dragOver ? 'border-brand-400 bg-brand-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg"
            onChange={handleFile}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
              <Camera className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-300 font-medium">Drop a JPEG photo here</p>
              <p className="text-sm text-slate-500 mt-1">or click to browse — no upload, everything stays on your device</p>
            </div>
          </div>
        </div>
      )}

      {/* Result View */}
      {imageUrl && (
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
            <div className="w-48 h-48 flex-shrink-0 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-semibold text-slate-200 truncate">{fileName}</h3>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
                <span>{(fileSize / 1024).toFixed(1)} KB</span>
                {imageDims && <span>{imageDims.w} × {imageDims.h} px</span>}
                {groups.reduce((s, g) => s + g.entries.length, 0) > 0 && (
                  <span className="text-green-400">
                    {groups.reduce((s, g) => s + g.entries.length, 0)} EXIF tags found
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setImageUrl(null);
                  setGroups([]);
                  setError('');
                  setImageDims(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Choose another photo
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* EXIF Data */}
          {groups.length > 0 ? (
            <div className="space-y-4">
              {groups.map((group, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-2 mb-3">
                    {group.name === 'GPS Location' ? (
                      <MapPin className="w-4 h-4 text-brand-400" />
                    ) : group.name === 'Exposure & Capture' ? (
                      <Settings className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Camera className="w-4 h-4 text-blue-400" />
                    )}
                    <h3 className="text-sm font-semibold text-slate-200">{group.name}</h3>
                    <span className="text-xs text-slate-500">({group.entries.length} tags)</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-400 w-1/3">Tag</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">Value</th>
                          <th className="w-10 px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map((entry, ei) => (
                          <tr key={ei} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors group/row">
                            <td className="px-4 py-2.5 text-slate-300 font-medium font-mono text-xs">{entry.tag}</td>
                            <td className="px-4 py-2.5">
                              <span className="text-slate-200 font-mono text-xs break-all">{entry.value}</span>
                              {entry.description && (
                                <span className="block text-xs text-slate-500 mt-0.5">{entry.description}</span>
                              )}
                            </td>
                            <td className="px-2 py-2.5">
                              <button
                                onClick={() => copyEntry(entry.value)}
                                className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-slate-700 rounded transition-all"
                                title="Copy value"
                              >
                                <Copy className="w-3 h-3 text-slate-400" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : !error && (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">No EXIF metadata found in this image</p>
              <p className="text-xs">The photo may have been stripped of metadata by social media or image editing tools.</p>
            </div>
          )}

          {/* GPS Map Link */}
          {(() => {
            const gpsGroup = groups.find(g => g.name === 'GPS Location');
            if (!gpsGroup) return null;
            const latRef = gpsGroup.entries.find(e => e.tag === 'GPSLatitudeRef')?.value || 'N';
            const lonRef = gpsGroup.entries.find(e => e.tag === 'GPSLongitudeRef')?.value || 'E';
            const latVal = gpsGroup.entries.find(e => e.tag === 'GPSLatitude')?.value;
            const lonVal = gpsGroup.entries.find(e => e.tag === 'GPSLongitude')?.value;

            if (!latVal || !lonVal) return null;

            // Try to parse GPS coordinates
            const parseCoord = (val: string, ref: string): number | null => {
              const parts = val.split(',').map(Number);
              if (parts.length < 3 || parts.some(isNaN)) return null;
              const deg = parts[0];
              const min = parts[1];
              const sec = parts[2];
              let decimal = deg + min / 60 + sec / 3600;
              if (ref === 'S' || ref === 'W') decimal *= -1;
              return decimal;
            };

            const lat = parseCoord(latVal, latRef);
            const lon = parseCoord(lonVal, lonRef);

            if (lat === null || lon === null) return null;

            return (
              <a
                href={`https://www.google.com/maps?q=${lat},${lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 rounded-lg text-sm text-brand-300 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                View on Google Maps ({lat.toFixed(6)}, {lon.toFixed(6)})
              </a>
            );
          })()}
        </div>
      )}

      {/* Info about EXIF stripping */}
      <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700 rounded-lg text-sm text-slate-400">
        <Info className="w-4 h-4 text-slate-500 inline mr-2" />
        <strong>Note:</strong> Many social media platforms (Instagram, Twitter/X, Facebook) strip EXIF data from uploaded images.
        If your image shows no metadata, try the original photo from your camera or phone.
      </div>
    </ToolLayout>
  );
}
