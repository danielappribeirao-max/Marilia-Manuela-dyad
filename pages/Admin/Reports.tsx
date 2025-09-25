import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as api from '../../services/api';
import { Sale } from '../../types';
import { useApp } from '../../App';

type DateRange = 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'this_year' | 'all' | 'custom';

const toInputDateString = (date: Date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

const KPICard: React.FC<{ title: string; value: string; description: string }> = ({ title, value, description }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-500 uppercase">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
);

const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

export default function AdminReports() {
    const { services } = useApp();
    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const [activeRange, setActiveRange] = useState<DateRange>('30days');
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(today.getDate() - 29)));
    const [endDate, setEndDate] = useState(today);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    
    const [customStartDate, setCustomStartDate] = useState(startDate);
    const [customEndDate, setCustomEndDate] = useState(endDate);

    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            const salesData = await api.getSalesData();
            setAllSales(salesData || []);
            setLoading(false);
        };
        fetchSales();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const setDateFilter = (range: DateRange) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start = new Date(today);
        let end = new Date(today);

        switch (range) {
            case 'today': break;
            case 'yesterday': start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); break;
            case '7days': start.setDate(today.getDate() - 6); break;
            case '30days': start.setDate(today.getDate() - 29); break;
            case 'this_month': start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); break;
            case 'this_year': start = new Date(today.getFullYear(), 0, 1); end = new Date(today.getFullYear(), 11, 31); break;
            case 'all': break;
        }
        setStartDate(start);
        setEndDate(end);
        setActiveRange(range);
        setIsPopoverOpen(false);
    };

    const handleApplyCustomRange = () => {
        setStartDate(customStartDate);
        setEndDate(customEndDate);
        setActiveRange('custom');
        setIsPopoverOpen(false);
    };

    const formatDateRange = () => {
        const rangeMap: Record<DateRange, string> = {
            today: 'Hoje', yesterday: 'Ontem', '7days': 'Últimos 7 dias', '30days': 'Últimos 30 dias',
            this_month: 'Este Mês', this_year: 'Este Ano', all: 'Todo o Período',
            custom: `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`
        };
        return rangeMap[activeRange] || 'Selecione o período';
    };

    const filteredSales = useMemo(() => {
        if (activeRange === 'all') return allSales;
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        return allSales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startOfDay && saleDate <= endOfDay;
        });
    }, [allSales, activeRange, startDate, endDate]);

    const { totalSales, salesCount, averageSale } = useMemo(() => {
        const total = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
        const count = filteredSales.length;
        return { totalSales: total, salesCount: count, averageSale: count > 0 ? total / count : 0 };
    }, [filteredSales]);
    
    const kpiDescription = useMemo(() => {
        switch(activeRange) {
            case 'today': return 'para hoje.';
            case 'custom': return `de ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;
            default: return `no período (${formatDateRange().toLowerCase()}).`;
        }
    }, [activeRange, startDate, endDate]);

    const salesTrendData = useMemo(() => {
        const salesByDate = filteredSales.reduce((acc, sale) => {
            const dateKey = new Date(sale.date).toISOString().split('T')[0];
            acc[dateKey] = (acc[dateKey] || 0) + sale.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(salesByDate)
            .map(([dateString, faturamento]) => ({ date: new Date(dateString), faturamento }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(item => ({ name: item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), Faturamento: item.faturamento }));
    }, [filteredSales]);
    
    const topServicesData = useMemo(() => {
        const salesByService = filteredSales.reduce((acc: Record<string, { faturamento: number; quantidade: number }>, sale) => {
            const serviceName = sale.serviceName;
            if (!acc[serviceName]) {
                acc[serviceName] = { faturamento: 0, quantidade: 0 };
            }
            acc[serviceName].faturamento += sale.amount;
            acc[serviceName].quantidade += 1;
            return acc;
        }, {} as Record<string, { faturamento: number; quantidade: number }>);

       return Object.entries(salesByService)
           .map(([name, data]: [string, { faturamento: number; quantidade: number }]) => ({ name, Faturamento: data.faturamento, Quantidade: data.quantidade }))
           .sort((a, b) => b.Faturamento - a.Faturamento).slice(0, 5);
    }, [filteredSales]);
    
    const salesByCategoryData = useMemo(() => {
        const salesByCat = filteredSales.reduce((acc, sale) => {
            const service = services.find(s => s.name === sale.serviceName);
            const category = service?.category || 'Outros';
            acc[category] = (acc[category] || 0) + sale.amount;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(salesByCat).map(([name, value]) => ({ name, value }));
    }, [filteredSales, services]);

    const PIE_COLORS = ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#a855f7'];
    const CustomServiceTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white/90 backdrop-blur-sm p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-bold text-gray-800 mb-1">{label}</p>
                    <p className="text-sm text-pink-600"><strong>Faturamento:</strong> R$ {data.Faturamento.toFixed(2).replace('.', ',')}</p>
                    <p className="text-sm text-gray-600"><strong>Vendas:</strong> {data.Quantidade}</p>
                </div>
            );
        }
        return null;
    };
    // Fix: Add explicit type to ensure `range` is `DateRange`, not `string`.
    const dateRanges: { label: string; range: DateRange }[] = [ { label: 'Hoje', range: 'today' }, { label: 'Ontem', range: 'yesterday' }, { label: 'Últimos 7 dias', range: '7days' }, { label: 'Últimos 30 dias', range: '30days' }, { label: 'Este Mês', range: 'this_month' }, { label: 'Este Ano', range: 'this_year' }, { label: 'Todo o Período', range: 'all' }];

    if (loading) return <div>Carregando relatórios...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-3xl font-bold">Relatórios de Vendas</h2>
                <div className="relative">
                    <button onClick={() => setIsPopoverOpen(!isPopoverOpen)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"><CalendarIcon /><span>{formatDateRange()}</span><ChevronDownIcon /></button>
                    {isPopoverOpen && (
                        <div ref={popoverRef} className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-10">
                           <div className="p-4 grid grid-cols-1 gap-2">
                                {dateRanges.map(({label, range}) => <button key={range} onClick={() => setDateFilter(range)} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeRange === range && activeRange !== 'custom' ? 'bg-pink-100 text-pink-700 font-semibold' : 'hover:bg-gray-100'}`}>{label}</button>)}
                           </div>
                           <div className="border-t border-gray-200 p-4 space-y-3">
                                <h4 className="text-sm font-semibold text-gray-600">Período Personalizado</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label htmlFor="startDate" className="text-xs font-medium text-gray-500">De:</label>
                                        <input type="date" id="startDate" value={toInputDateString(customStartDate)} onChange={(e) => setCustomStartDate(new Date(e.target.value + 'T00:00:00'))} className="w-full mt-1 p-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900" />
                                    </div>
                                    <div>
                                        <label htmlFor="endDate" className="text-xs font-medium text-gray-500">Até:</label>
                                        <input type="date" id="endDate" value={toInputDateString(customEndDate)} onChange={(e) => setCustomEndDate(new Date(e.target.value + 'T00:00:00'))} className="w-full mt-1 p-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900" />
                                    </div>
                                </div>
                                <button onClick={handleApplyCustomRange} className="w-full px-4 py-2 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 transition-colors">Aplicar</button>
                           </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard title="Faturamento Total" value={`R$ ${totalSales.toFixed(2).replace('.', ',')}`} description={`Receita total ${kpiDescription}`} />
                <KPICard title="Total de Vendas" value={salesCount.toString()} description={`Número de transações ${kpiDescription}`} />
                <KPICard title="Ticket Médio" value={`R$ ${averageSale.toFixed(2).replace('.', ',')}`} description={`Valor médio por venda ${kpiDescription}`} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-semibold mb-4">Tendência de Faturamento</h3><div style={{ width: '100%', height: 300 }}><ResponsiveContainer><BarChart data={salesTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} /><Tooltip formatter={(value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`} /><Bar dataKey="Faturamento" fill="#ec4899" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-semibold mb-4">Vendas por Categoria</h3><div style={{ width: '100%', height: 300 }}><ResponsiveContainer><PieChart><Pie data={salesByCategoryData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name">{salesByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`} /><Legend iconSize={10} /></PieChart></ResponsiveContainer></div></div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-semibold mb-4">Serviços Mais Vendidos</h3><div style={{ width: '100%', height: 400 }}><ResponsiveContainer><BarChart data={topServicesData} margin={{ top: 5, right: 20, left: -10, bottom: 120 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 12 }} /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} /><Tooltip content={<CustomServiceTooltip />} cursor={{ fill: 'rgba(236, 72, 153, 0.1)' }} /><Bar dataKey="Faturamento" fill="#f472b6" radius={[4, 4, 0, 0]} barSize={30} /></BarChart></ResponsiveContainer></div></div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b"><h3 className="text-lg font-semibold">Vendas Detalhadas</h3></div>
                <div className="overflow-x-auto"><table className="min-w-full leading-normal">
                    <thead><tr className="bg-gray-50 text-left text-gray-600 uppercase text-sm font-semibold"><th className="px-5 py-3">ID da Venda</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Serviço</th><th className="px-5 py-3">Data</th><th className="px-5 py-3 text-right">Valor</th></tr></thead>
                    <tbody className="text-gray-700">
                        {filteredSales.length > 0 ? filteredSales.map(sale => (
                            <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-5 py-4 text-sm"><p className="font-mono text-gray-500">{sale.id.substring(0,8)}...</p></td>
                                <td className="px-5 py-4 text-sm"><p>{sale.clientName}</p></td>
                                <td className="px-5 py-4 text-sm"><p>{sale.serviceName}</p></td>
                                <td className="px-5 py-4 text-sm"><p>{new Date(sale.date).toLocaleDateString('pt-BR')}</p></td>
                                <td className="px-5 py-4 text-sm text-right"><p className="font-semibold">R$ {sale.amount.toFixed(2).replace('.', ',')}</p></td>
                            </tr>
                        )) : (<tr><td colSpan={5} className="text-center py-10 text-gray-500">Nenhuma venda encontrada para o período selecionado.</td></tr>)}
                    </tbody>
                </table></div>
            </div>
        </div>
    );
}