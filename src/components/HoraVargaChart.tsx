import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const HoraVargaChart: React.FC = () => {
    const [planetPositions, setPlanetPositions] = useState<PlanetPosition[]>([
        { planetName: '', rashi: '', degree: '' }
    ]);
    const [lagna, setLagna] = useState<LagnaPosition>({ rashi: '', degree: '' });
    const [horaChart, setHoraChart] = useState<HoraChartEntry[]>([]);
    const [selectedHoraRashi, setSelectedHoraRashi] = useState<string | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

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
            ...planetPositions.map(planet => ({
                ...planet,
                horaRashi: calculateHoraPlacement(planet.rashi, parseFloat(planet.degree || '0'))
            }))
        ];
        setHoraChart(computedChart);
    };

    const generatePDF = () => {
        // Create a new jsPDF instance
        const doc = new jsPDF();

        // Set font
        doc.setFont('helvetica');

        // Title
        doc.setFontSize(16);
        doc.text('D2 ஹோரா வர்க வரைபடம்', 105, 20, { align: 'center' });

        // Table headers
        doc.setFontSize(12);
        doc.text('கிரகம்', 20, 40);
        doc.text('D1 ராசி', 70, 40);
        doc.text('D1 பாகம்', 120, 40);
        doc.text('ஹோரா ராசி', 170, 40);
        
        // Draw a line under headers
        doc.line(10, 45, 200, 45);

        // Add chart data
        let yOffset = 50;
        horaChart.forEach((planet) => {
            doc.text(planet.planetName, 20, yOffset);
            doc.text(planet.rashi, 70, yOffset);
            doc.text(`${planet.degree}°`, 120, yOffset);
            doc.text(planet.horaRashi, 170, yOffset);
            
            yOffset += 10;
        });

        // Add Hora Rashi Interpretation if selected
        if (selectedHoraRashi) {
            const interpretation = HORA_INTERPRETATIONS[selectedHoraRashi];
            
            yOffset += 20;
            doc.setFontSize(14);
            doc.text(interpretation.title, 105, yOffset, { align: 'center' });
            
            yOffset += 10;
            doc.setFontSize(12);
            // Wrap text if it's too long
            const splitText = doc.splitTextToSize(interpretation.description, 170);
            doc.text(splitText, 20, yOffset);
            
            yOffset += 20;
            doc.text('முக்கிய குணங்கள்:', 20, yOffset);
            
            yOffset += 10;
            interpretation.keyQualities.forEach((quality, index) => {
                doc.text(`• ${quality}`, 30, yOffset + (index * 10));
            });
        }
        
        // Save the PDF
        doc.save('hora_varga_chart.pdf');
    };

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">
                        D2 ஹோரா வர்க வரைபடம் (Hora Varga Chart)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Lagna Input Section */}
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">லக்நம் (Lagna)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Lagna Rashi Selection */}
                            <div>
                                <Select 
                                    value={lagna.rashi}
                                    onValueChange={(value) => setLagna(prev => ({...prev, rashi: value}))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="லக்நம் ராசி" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <ScrollArea className="h-72">
                                            {RASHI_LIST.map((rashi, index) => (
                                                <SelectItem 
                                                    key={`lagna-rashi-${index}`} 
                                                    value={rashi}
                                                >
                                                    {rashi}
                                                </SelectItem>
                                            ))}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Lagna Degree Input */}
                            <Input 
                                type="number" 
                                min="0" 
                                max="30" 
                                placeholder="லக்நம் பாகம் (0-30)" 
                                value={lagna.degree}
                                onChange={(e) => setLagna(prev => ({...prev, degree: e.target.value}))}
                            />
                        </div>
                    </div>

                    {/* Planetary Input Section */}
                    <div className="space-y-4">
                        {planetPositions.map((planet, index) => (
                            <div key={index} className="grid grid-cols-3 gap-4">
                                {/* Planet Name Selection */}
                                <Select 
                                    value={planet.planetName}
                                    onValueChange={(value) => updatePlanetInput(index, 'planetName', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="கிரகம்" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <ScrollArea className="h-72">
                                            {PLANET_LIST.map((planetName, planetIndex) => (
                                                <SelectItem 
                                                    key={`planet-${planetIndex}`} 
                                                    value={planetName}
                                                >
                                                    {planetName}
                                                </SelectItem>
                                            ))}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>

                                {/* Rashi Selection */}
                                <Select 
                                    value={planet.rashi}
                                    onValueChange={(value) => updatePlanetInput(index, 'rashi', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="ராசி" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <ScrollArea className="h-72">
                                            {RASHI_LIST.map((rashi, rashiIndex) => (
                                                <SelectItem 
                                                    key={`rashi-${rashiIndex}`} 
                                                    value={rashi}
                                                >
                                                    {rashi}
                                                </SelectItem>
                                            ))}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>

                                {/* Degree Input */}
                                <Input 
                                    type="number" 
                                    min="0" 
                                    max="30" 
                                    placeholder="பாகம் (0-30)" 
                                    value={planet.degree}
                                    onChange={(e) => updatePlanetInput(index, 'degree', e.target.value)}
                                />
                            </div>
                        ))}

                        {/* Action Buttons */}
                        <div className="flex space-x-2 mt-4">
                            <Button onClick={addPlanetInput} variant="outline">
                                + கிரகம் சேர்க்கை
                            </Button>
                            <Button onClick={generateHoraChart}>
                                ஹோரா வர்கம் உருவாக்கு
                            </Button>
                            {horaChart.length > 0 && (
                                <Button onClick={generatePDF} variant="secondary">
                                    PDF ஏற்றுமதி
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Computed Hora Chart Display */}
                    {horaChart.length > 0 && (
                        <div className="mt-6 print:block" ref={chartRef}>
                            <h3 className="text-xl font-bold mb-4">ஹோரா வர்க பலன்கள்</h3>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border p-2">கிரகம்</th>
                                        <th className="border p-2">D1 ராசி</th>
                                        <th className="border p-2">D1 பாகம்</th>
                                        <th className="border p-2">ஹோரா ராசி</th>
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
                    )}

                    {/* Hora Rashi Interpretation */}
                    {selectedHoraRashi && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-lg font-bold mb-2">
                                {HORA_INTERPRETATIONS[selectedHoraRashi].title}
                            </h4>
                            <p className="mb-2">
                                {HORA_INTERPRETATIONS[selectedHoraRashi].description}
                            </p>
                            <h5 className="font-semibold">முக்கிய குணங்கள்:</h5>
                            <ul className="list-disc pl-5">
                                {HORA_INTERPRETATIONS[selectedHoraRashi].keyQualities.map((quality, index) => (
                                    <li key={index}>{quality}</li>
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
                    .print\:block {
                        visibility: visible;
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