'use client';

import { useState } from 'react';
import { useUserProfile } from '@/lib/auth';
import { edgeFunctions, Incident } from '@/lib/edgeFunctions';
import { ChevronLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Download, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function ImportIncidentPage() {
    const { role, assignedRegionId, loading } = useUserProfile();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && role !== 'ENCODER') {
            router.push('/dashboard');
        }
    }, [role, loading, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
            setError(null);
            setSuccess(null);
        }
    };

    const parseFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);
                setParsedData(jsonData);
            } catch (err) {
                console.error("Error parsing file:", err);
                setError("Failed to parse file. Please ensure it is a valid Excel or CSV file.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const mapRowToIncident = (row: any): Incident | null => {
        // Basic mapping logic - assumes headers match/resemble field names
        // In a real app, this would be more robust with validation

        if (!assignedRegionId) return null;

        try {
            return {
                region_id: assignedRegionId,
                incident_nonsensitive_details: {
                    notification_dt: row['Notification Date'] || row['notification_dt'] || new Date().toISOString(),
                    barangay: row['Barangay'] || row['barangay'] || 'Unknown',
                    city_id: 1, // Defaulting for MVP
                    province_id: 1, // Defaulting for MVP
                    district_id: 1, // Defaulting for MVP
                    general_category: row['Category'] || row['general_category'] || 'Residential',
                    incident_type: row['Classification'] || row['incident_type'] || 'Structural',
                    alarm_level: row['Alarm Level'] || row['alarm_level'] || 'First Alarm',
                    responder_type: row['Responder Type'] || row['responder_type'] || 'First Responder',
                    structures_affected: parseInt(row['Structures Affected'] || row['structures_affected'] || '0'),
                    households_affected: parseInt(row['Families Affected'] || row['households_affected'] || '0'),
                    individuals_affected: parseInt(row['Individuals Affected'] || row['individuals_affected'] || '0'),
                    fire_origin: row['Area of Origin'] || row['fire_origin'] || '',
                    extent_of_damage: row['Extent of Damage'] || row['extent_of_damage'] || '',
                    resources_deployed: { engines: 0, ambulances: 0 },
                    problems_encountered: []
                },
                incident_sensitive_details: {
                    occupancy: 'Residential',
                    casualties_count: 0,
                    estimated_damage: parseInt(row['Est. Damage'] || row['estimated_damage'] || '0'),
                    caller_name: row['Caller Name'] || row['caller_name'] || '',
                    caller_number: '',
                    receiver_name: row['Receiver Name'] || row['receiver_name'] || '',
                    owner_name: row['Owner Name'] || row['owner_name'] || '',
                    establishment_name: row['Establishment Name'] || row['establishment_name'] || '',
                    personnel_on_duty: { commander: row['Commander'] || '', nozzleman: '' },
                    narrative_report: row['Narrative'] || row['narrative_report'] || '',
                }
            };
        } catch (e) {
            console.error("Error mapping row:", row, e);
            return null;
        }
    };

    const handleUpload = async () => {
        if (!parsedData.length || !assignedRegionId) return;
        setUploading(true);
        setError(null);

        try {
            const incidents: Incident[] = parsedData
                .map(mapRowToIncident)
                .filter(i => i !== null) as Incident[];

            if (incidents.length === 0) {
                throw new Error("No valid incidents found in file.");
            }

            const payload = {
                region_id: assignedRegionId,
                incidents: incidents
            };

            const res = await edgeFunctions.uploadBundle(payload);
            setSuccess(`Successfully uploaded ${incidents.length} incidents. Batch ID: ${res.batch_id}`);
            setParsedData([]);
            setFile(null);
        } catch (err: any) {
            console.error("Upload failed:", err);
            setError(err.message || "Failed to upload bundle.");
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        // Create a dummy row with headers
        const headers = [
            {
                'Notification Date': '2023-01-01',
                'Barangay': 'Sample Brgy',
                'Category': 'Residential',
                'Classification': 'Structural',
                'Alarm Level': 'First Alarm',
                'Responder Type': 'First Responder',
                'Structures Affected': 1,
                'Families Affected': 5,
                'Individuals Affected': 20,
                'Est. Damage': 50000,
                'Area of Origin': 'Kitchen',
                'Extent of Damage': 'Partial',
                'Caller Name': 'Juan Dela Cruz',
                'Receiver Name': 'Operator A',
                'Owner Name': 'Maria Clara',
                'Establishment Name': 'N/A',
                'Commander': 'F/Insp. Pag-asa',
                'Narrative': 'Fire started at...'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "BFP_Incident_Template.xlsx");
    };

    if (loading) return <div>Loading...</div>;
    if (role !== 'ENCODER') return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Import Incidents</h1>
                </div>
                <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    <Download className="w-4 h-4" /> Download Template
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <UploadCloud className="w-12 h-12 text-gray-500 mb-4" />
                        <span className="text-lg font-bold text-gray-900">Click to upload or drag and drop</span>
                        <span className="text-sm font-medium text-gray-600 mt-1">XLSX, XLS, or CSV files</span>
                    </label>
                </div>

                {file && (
                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-md border border-blue-100">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                            <div>
                                <p className="font-medium text-blue-900">{file.name}</p>
                                <p className="text-xs text-blue-700">{(file.size / 1024).toFixed(2)} KB • {parsedData.length} rows</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setFile(null); setParsedData([]); }}
                            className="text-gray-400 hover:text-red-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">{success}</p>
                    </div>
                )}

                <div className="pt-4 border-t">
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading || parsedData.length === 0}
                        className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {uploading ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
                        {uploading ? 'Uploading Bundle...' : 'Upload Incidents'}
                    </button>
                </div>
            </div>

            {/* Preview (First 5 rows) */}
            {parsedData.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 overflow-x-auto">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Preview (First 5 Rows)</h3>
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-100">
                                {Object.keys(parsedData[0]).slice(0, 8).map(key => (
                                    <th key={key} className="p-2 border">{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {parsedData.slice(0, 5).map((row, idx) => (
                                <tr key={idx} className="border-b">
                                    {Object.values(row).slice(0, 8).map((val: any, vIdx) => (
                                        <td key={vIdx} className="p-2 border truncate max-w-[150px]">{val}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function UploadCloud(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m16 16-4-4-4 4" />
        </svg>
    )
}
