import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Type definitions
interface PlanetPosition {
    planetName: string;
    rashi: string;
    degree: string;
}

interface LagnaPosition {
    rashi: string;
    degree: string;
}

interface HoraChartEntry extends PlanetPosition {
    horaRashi: string;
}

interface HoraInterpretation {
    title: string;
    description: string;
    keyQualities: string[];
}

// Comprehensive Astrological Constants in Tamil
const RASHI_LIST = [
    'மேஷம்', 'ரிஷபம்', 'மிதுனம்', 'கடகம்', 
    'சிம்மம்', 'கன்னி', 'துலாம்', 'விருச்சிகம்', 
    'தனுசு', 'மகரம்', 'கும்பம்', 'மீனம்'
];

const PLANET_LIST = [
    'சூரியன்', 'சந்திரன்', 'செவ்வாய்', 
    'புதன்', 'குரு', 'சுக்கிரன்', 
    'சனி', 'ராகு', 'கேது'
];

// Planetary Hora Interpretations
const HORA_INTERPRETATIONS: Record<string, HoraInterpretation> = {
    'கடகம்': {
        title: 'கடகம் (Cancer) - பெண் ஹோரா',
        description: 'பெண் ஹோரா நிலை. உணர்வுகளின் ஆழம், பாதுகாப்பு மற்றும் குடும்ப தொடர்புகளைக் குறிக்கிறது.',
        keyQualities: [
            'உணர்ச்சிகரமான மனப்பான்மை',
            'பரிவுடன் கூடிய அணுகுமுறை',
            'குடும்ப மதிப்புகளுக்கு முக்கியத்துவம்'
        ]
    },
    'சிம்மம்': {
        title: 'சிம்மம் (Leo) - ஆண் ஹோரா',
        description: 'ஆண் ஹோரா நிலை. தன்னம்பிக்கை, தலைமை மற்றும் படைப்பாற்றலைக் குறிக்கிறது.',
        keyQualities: [
            'வலிமையான தன்னம்பிக்கை',
            'தலைமைத்துவ இயல்பு',
            'திறமையான படைப்பாற்றல்'
        ]
    }
};

// Helper function to determine Hora placement
const calculateHoraPlacement = (rashi: string, degree: number): string => {
    const maleRashis = ['மேஷம்', 'மிதுனம்', 'சிம்மம்', 'துலாம்', 'தனுசு', 'கும்பம்'];
    const isMaleSign = maleRashis.includes(rashi);

    return isMaleSign 
        ? (degree <= 15 ? 'சிம்மம்' : 'கடகம்')
        : (degree <= 15 ? 'கடகம்' : 'சிம்மம்');
};

// Custom SelectBox to replace the standard Select component
const CustomSelect: React.FC<{
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
}> = ({ options, value, onChange, placeholder, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background text-left"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{value || placeholder}</span>
                <span>▼</span>
            </button>
            
            {isOpen && (
                <div className="absolute left-0 w-full mt-1 bg-white border rounded-md shadow-lg z-50">
                    <div className="max-h-60 overflow-y-auto">
                        {options.map((option, idx) => (
                            <div
                                key={idx}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                            >
                                {option}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const HoraVargaChart: React.FC = () => {
    const [planetPositions, setPlanetPositions] = useState<PlanetPosition[]>([
        { planetName: '', rashi: '', degree: '' }
    ]);
    const [lagna, setLagna] = useState<LagnaPosition>({ rashi: '', degree: '' });
    const [horaChart, setHoraChart] = useState<HoraChartEntry[]>([]);
    const [selectedHoraRashi, setSelectedHoraRashi] = useState<string | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const [fontLoaded, setFontLoaded] = useState(false);

    // Load the Tamil font for PDF
    useEffect(() => {
        const loadFont = async () => {
            try {
                // This URL points to a Tamil font that supports Tamil script
                const fontUrl = "https://cdn.jsdelivr.net/npm/lohit-tamil-web@2.91.4/Lohit-Tamil.woff2";
                
                const fontResponse = await fetch(fontUrl);
                const fontData = await fontResponse.arrayBuffer();
                
                // Store the font data in localStorage for use when generating PDF
                localStorage.setItem('tamilFontData', arrayBufferToBase64(fontData));
                setFontLoaded(true);
            } catch (error) {
                console.error("Error loading Tamil font:", error);
                // Fallback to use English transliteration if font loading fails
                setFontLoaded(true);
            }
        };
        
        loadFont();
    }, []);

    // Helper function to convert ArrayBuffer to Base64 string
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    const addPlanetInput = () => {
        setPlanetPositions(prev => [
            ...prev, 
            { planetName: '', rashi: '', degree: '' }
        ]);
    };

    const updatePlanetInput = (index: number, field: keyof PlanetPosition, value: string) => {
        setPlanetPositions(prev => {
            const updatedPositions = [...prev];
            updatedPositions[index] = {
                ...updatedPositions[index],
                [field]: value
            };
            return updatedPositions;
        });
    };

    const generateHoraChart = () => {
        const computedChart: HoraChartEntry[] = [
            ...(lagna.rashi ? [{
                planetName: 'லக்நம்',
                rashi: lagna.rashi,
                degree: lagna.degree,
                horaRashi: calculateHoraPlacement(lagna.rashi, parseFloat(lagna.degree || '0'))
            }] : []),
            ...planetPositions
                .filter(p => p.planetName && p.rashi) // Skip empty entries
                .map(planet => ({
                    ...planet,
                    horaRashi: calculateHoraPlacement(planet.rashi, parseFloat(planet.degree || '0'))
                }))
        ];
        setHoraChart(computedChart);
    };

    // Helper function to get English equivalents for Tamil text (for PDF fallback)
    const getTamilEquivalent = (tamilText: string): string => {
        const tamilToEnglish: Record<string, string> = {
            'லக்நம்': 'Lagna',
            'மேஷம்': 'Mesha',
            'ரிஷபம்': 'Rishabha',
            'மிதுனம்': 'Mithuna',
            'கடகம்': 'Kataka',
            'சிம்மம்': 'Simha',
            'கன்னி': 'Kanni',
            'துலாம்': 'Thulam',
            'விருச்சிகம்': 'Vrischika',
            'தனுசு': 'Dhanusu',
            'மகரம்': 'Makara',
            'கும்பம்': 'Kumbha',
            'மீனம்': 'Meena',
            'சூரியன்': 'Surya',
            'சந்திரன்': 'Chandra',
            'செவ்வாய்': 'Sevvai',
            'புதன்': 'Budha',
            'குரு': 'Guru',
            'சுக்கிரன்': 'Sukra',
            'சனி': 'Sani',
            'ராகு': 'Rahu',
            'கேது': 'Ketu',
            // Add more mappings as needed
        };
        
        return tamilToEnglish[tamilText] || tamilText;
    };

    const generatePDF = () => {
        // Create a new jsPDF instance with Unicode support
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // For PDF generation, we'll use transliteration as a fallback
        // since embedding Tamil fonts is challenging
        const useTransliteration = true;

        // Set title
        doc.setFontSize(16);
        doc.text('D2 Hora Varga Chart', 105, 20, { align: 'center' });

        // Table headers
        doc.setFontSize(12);
        doc.text('Planet', 20, 40);
        doc.text('D1 Rashi', 70, 40);
        doc.text('D1 Degree', 120, 40);
        doc.text('Hora Rashi', 170, 40);
        
        // Draw a line under headers
        doc.line(10, 45, 200, 45);

        // Add chart data
        let yOffset = 50;
        horaChart.forEach((planet) => {
            const planetName = useTransliteration ? getTamilEquivalent(planet.planetName) : planet.planetName;
            const rashiName = useTransliteration ? getTamilEquivalent(planet.rashi) : planet.rashi;
            const horaRashiName = useTransliteration ? getTamilEquivalent(planet.horaRashi) : planet.horaRashi;
            
            doc.text(planetName, 20, yOffset);
            doc.text(rashiName, 70, yOffset);
            doc.text(`${planet.degree}°`, 120, yOffset);
            doc.text(horaRashiName, 170, yOffset);
            
            yOffset += 10;
        });

        // Add Hora Rashi Interpretation if selected
        if (selectedHoraRashi && HORA_INTERPRETATIONS[selectedHoraRashi]) {
            const interpretation = HORA_INTERPRETATIONS[selectedHoraRashi];
            const titleText = useTransliteration 
                ? `${getTamilEquivalent(selectedHoraRashi)} - ${selectedHoraRashi === 'கடகம்' ? 'Female Hora' : 'Male Hora'}`
                : interpretation.title;
            
            yOffset += 20;
            doc.setFontSize(14);
            doc.text(titleText, 105, yOffset, { align: 'center' });
            
            // Description - Simplified for PDF
            yOffset += 10;
            doc.setFontSize(12);
            if (selectedHoraRashi === 'கடகம்') {
                const simplifiedText = "Female Hora. Represents depth of emotions, protection, and family connections.";
                doc.text(simplifiedText, 20, yOffset);
            } else if (selectedHoraRashi === 'சிம்மம்') {
                const simplifiedText = "Male Hora. Represents confidence, leadership, and creativity.";
                doc.text(simplifiedText, 20, yOffset);
            }
            
            // Key qualities in English
            yOffset += 20;
            doc.text('Key Qualities:', 20, yOffset);
            
            yOffset += 10;
            if (selectedHoraRashi === 'கடகம்') {
                doc.text('• Emotional disposition', 30, yOffset);
                doc.text('• Compassionate approach', 30, yOffset + 10);
                doc.text('• Values family connections', 30, yOffset + 20);
            } else if (selectedHoraRashi === 'சிம்மம்') {
                doc.text('• Strong self-confidence', 30, yOffset);
                doc.text('• Leadership qualities', 30, yOffset + 10);
                doc.text('• Creative expression', 30, yOffset + 20);
            }
        }
        
        // Save the PDF
        doc.save('hora_varga_chart.pdf');
    };

    return (
        <div className="p-4 max-w-5xl mx-auto">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">
                        D2 ஹோரா வர்க வரைபடம் (Hora Varga Chart)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Lagna Input Section */}
                    <div className="mb-12">
                        <h3 className="text-xl font-semibold mb-6">லக்நம் (Lagna)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Lagna Rashi Selection */}
                            <div>
                                <CustomSelect
                                    options={RASHI_LIST}
                                    value={lagna.rashi}
                                    onChange={(value) => setLagna(prev => ({...prev, rashi: value}))}
                                    placeholder="மேஷம்"
                                />
                            </div>

                            {/* Lagna Degree Input */}
                            <div>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    max="30" 
                                    placeholder="லக்நம் பாகம் (0-30)" 
                                    value={lagna.degree}
                                    onChange={(e) => setLagna(prev => ({...prev, degree: e.target.value}))}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Planetary Input Section */}
                    <div className="space-y-8 mb-8">
                        <h3 className="text-xl font-semibold mb-6">கிரக நிலைகள் (Planetary Positions)</h3>
                        
                        {planetPositions.map((planet, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {/* Planet Name Selection */}
                                <div>
                                    <CustomSelect
                                        options={PLANET_LIST}
                                        value={planet.planetName}
                                        onChange={(value) => updatePlanetInput(index, 'planetName', value)}
                                        placeholder="கிரகம்"
                                    />
                                </div>

                                {/* Rashi Selection */}
                                <div>
                                    <CustomSelect
                                        options={RASHI_LIST}
                                        value={planet.rashi}
                                        onChange={(value) => updatePlanetInput(index, 'rashi', value)}
                                        placeholder="ராசி"
                                    />
                                </div>

                                {/* Degree Input */}
                                <div>
                                    <Input 
                                        type="number" 
                                        min="0" 
                                        max="30" 
                                        placeholder="பாகம் (0-30)" 
                                        value={planet.degree}
                                        onChange={(e) => updatePlanetInput(index, 'degree', e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4 mt-8">
                            <Button onClick={addPlanetInput} variant="outline" className="px-4 py-2">
                                + கிரகம் சேர்க்கை
                            </Button>
                            <Button onClick={generateHoraChart} className="px-4 py-2">
                                ஹோரா வர்கம் உருவாக்கு
                            </Button>
                            {horaChart.length > 0 && (
                                <Button 
                                    onClick={generatePDF} 
                                    variant="secondary" 
                                    className="px-4 py-2"
                                    disabled={!fontLoaded}
                                >
                                    PDF ஏற்றுமதி
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Computed Hora Chart Display */}
                    {horaChart.length > 0 && (
                        <div className="mt-10 print:block" ref={chartRef}>
                            <h3 className="text-xl font-bold mb-6">ஹோரா வர்க பலன்கள்</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-center">கிரகம்</th>
                                            <th className="border p-2 text-center">D1 ராசி</th>
                                            <th className="border p-2 text-center">D1 பாகம்</th>
                                            <th className="border p-2 text-center">ஹோரா ராசி</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {horaChart.map((planet, index) => (
                                            <tr 
                                                key={index}
                                                className={
                                                    planet.horaRashi === 'கடகம்' 
                                                        ? 'bg-pink-100 cursor-pointer' 
                                                        : planet.horaRashi === 'சிம்மம்' 
                                                        ? 'bg-blue-100 cursor-pointer' 
                                                        : 'cursor-pointer'
                                                }
                                                onClick={() => setSelectedHoraRashi(planet.horaRashi)}
                                            >
                                                <td className="border p-2 text-center">{planet.planetName}</td>
                                                <td className="border p-2 text-center">{planet.rashi}</td>
                                                <td className="border p-2 text-center">{planet.degree}°</td>
                                                <td className="border p-2 text-center">{planet.horaRashi}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Hora Rashi Interpretation */}
                    {selectedHoraRashi && (
                        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                            <h4 className="text-lg font-bold mb-3">
                                {HORA_INTERPRETATIONS[selectedHoraRashi].title}
                            </h4>
                            <p className="mb-4">
                                {HORA_INTERPRETATIONS[selectedHoraRashi].description}
                            </p>
                            <h5 className="font-semibold mb-2">முக்கிய குணங்கள்:</h5>
                            <ul className="list-disc pl-6">
                                {HORA_INTERPRETATIONS[selectedHoraRashi].keyQualities.map((quality, index) => (
                                    <li key={index} className="mb-1">{quality}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Custom Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print\\:block, .print\\:block * {
                        visibility: visible;
                    }
                    .print\\:block {
                        position: absolute;
                        left: 0;
                        top: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default HoraVargaChart;