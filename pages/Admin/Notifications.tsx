import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import * as api from '../../services/api';
import { Booking, User } from '../../types';

// A simple toggle switch component for reusability
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-pink-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
        </label>
    );
};

export default function AdminNotifications() {
    const { services, professionals } = useApp();
    const [users, setUsers] = useState<User[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    const [timings, setTimings] = useState<number[]>([24, 1]); // Default timings: 24h and 1h
    const [channels, setChannels] = useState({ email: true, whatsapp: false });
    const [messageTemplate, setMessageTemplate] = useState(
`Olá {clientName},
Este é um lembrete do seu agendamento na Marília Manuela.

Serviço: {serviceName}
Profissional: {professionalName}
Data: {date} às {time}

Mal podemos esperar para vê-lo(a)!
Equipe Marília Manuela`
    );
    const [templateError, setTemplateError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const [allUsers, allBookings] = await Promise.all([
                api.getUsersWithRoles(),
                api.getAllBookings(),
            ]);
            setUsers(allUsers || []);
            setBookings(allBookings || []);
        };
        fetchData();
    }, []);

    const availableTimings = [24, 12, 3, 1]; // in hours

    const handleTimingToggle = (timing: number) => {
        setTimings(prev => 
            prev.includes(timing) ? prev.filter(t => t !== timing) : [...prev, timing]
        );
    };

    const handleChannelChange = (channel: 'email' | 'whatsapp') => {
        setChannels(prev => ({...prev, [channel]: !prev[channel]}));
    };

    const handleSave = () => {
        if (remindersEnabled && messageTemplate.trim() === '') {
            setTemplateError('O modelo da mensagem não pode estar vazio quando os lembretes estão ativados.');
            return;
        }

        setTemplateError('');
        const settings = {
            remindersEnabled,
            timings,
            channels,
            messageTemplate,
        };
        console.log("Saving settings:", settings);
        alert("Configurações salvas com sucesso!");
    };

    const handleTest = () => {
        // 1. Check for enabled channels
        if (!channels.email && !channels.whatsapp) {
            alert("Por favor, selecione pelo menos um canal de envio (E-mail ou WhatsApp) para testar.");
            return;
        }
        
        // 2. Check for timings
        if (timings.length === 0) {
            alert("Por favor, selecione pelo menos um horário para o envio do lembrete.");
            return;
        }

        // 3. Get mock data
        if (bookings.length === 0 || users.length === 0) {
            alert("Dados de teste não disponíveis ou ainda carregando. Tente novamente.");
            return;
        }
        const mockBooking = bookings[0];
        const client = users.find(u => u.id === mockBooking.userId);
        const service = services.find(s => s.id === mockBooking.serviceId);
        const professional = professionals.find(p => p.id === mockBooking.professionalId);

        if (!client || !service || !professional) {
            alert("Não foi possível gerar a mensagem de teste. Dados de mock não encontrados.");
            return;
        }

        // 4. Populate message template
        const personalizedMessage = messageTemplate
            .replace('{clientName}', client.name)
            .replace('{serviceName}', service.name)
            .replace('{professionalName}', professional.name)
            .replace('{date}', new Date(mockBooking.date).toLocaleDateString('pt-BR'))
            .replace('{time}', new Date(mockBooking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        
        // 5. Format timings string
        const timingsString = timings.sort((a, b) => b - a).join(' e ') + ` hora${timings.length > 1 || (timings.length > 0 && timings[0] > 1) ? 's' : ''} antes`;

        // 6. Build simulation message
        let finalAlertMessage = "--- Visualização do Lembrete de Teste ---\n";
        finalAlertMessage += `(Configurado para enviar ${timingsString} do agendamento)\n\n`;

        if (channels.email) {
            finalAlertMessage += `📧 E-MAIL:\n`;
            finalAlertMessage += `Um e-mail seria enviado para ${client.email} com o conteúdo:\n`;
            finalAlertMessage += `--------------------------------\n${personalizedMessage}\n--------------------------------\n\n`;
        }

        if (channels.whatsapp) {
            finalAlertMessage += `📱 WHATSAPP:\n`;
            finalAlertMessage += `Uma mensagem seria enviada para ${client.phone} com o conteúdo:\n`;
            finalAlertMessage += `--------------------------------\n${personalizedMessage}\n--------------------------------\n`;
        }

        // 7. Show alert
        alert(finalAlertMessage);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Configurações de Lembretes</h2>
            <div className="space-y-8">
                {/* General Settings */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-semibold">Lembretes Automáticos</h3>
                            <p className="text-gray-500 text-sm mt-1">Ative para enviar lembretes automáticos para os clientes sobre seus agendamentos.</p>
                        </div>
                        <ToggleSwitch enabled={remindersEnabled} onChange={setRemindersEnabled} />
                    </div>
                </div>

                {/* Reminder Timing */}
                <div className={`bg-white p-6 rounded-lg shadow-md transition-opacity ${remindersEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <h3 className="text-xl font-semibold mb-4">Quando enviar?</h3>
                    <p className="text-gray-500 text-sm mb-4">Selecione quanto tempo antes do agendamento o lembrete deve ser enviado. Você pode selecionar múltiplas opções.</p>
                    <div className="flex flex-wrap gap-3">
                        {availableTimings.map(timing => (
                            <button
                                key={timing}
                                onClick={() => handleTimingToggle(timing)}
                                className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                                    timings.includes(timing) 
                                    ? 'bg-pink-500 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-pink-100'
                                }`}
                            >
                                {timing} hora{timing > 1 ? 's' : ''} antes
                            </button>
                        ))}
                    </div>
                </div>

                {/* Delivery Channels */}
                <div className={`bg-white p-6 rounded-lg shadow-md transition-opacity ${remindersEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <h3 className="text-xl font-semibold mb-4">Canais de Envio</h3>
                    <div className="space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={channels.email} onChange={() => handleChannelChange('email')} className="h-5 w-5 text-pink-600 border-gray-300 rounded focus:ring-pink-500" />
                            <span className="text-gray-700">E-mail</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={channels.whatsapp} onChange={() => handleChannelChange('whatsapp')} className="h-5 w-5 text-pink-600 border-gray-300 rounded focus:ring-pink-500" />
                            <span className="text-gray-700">WhatsApp</span>
                        </label>
                    </div>
                </div>

                {/* Message Template */}
                <div className={`bg-white p-6 rounded-lg shadow-md transition-opacity ${remindersEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <h3 className="text-xl font-semibold mb-2">Modelo da Mensagem</h3>
                    <p className="text-gray-500 text-sm mb-4">Personalize a mensagem que será enviada. Use as variáveis abaixo para incluir detalhes do agendamento.</p>
                    <div className="bg-gray-100 p-2 rounded-md text-xs text-gray-600 mb-4 flex flex-wrap gap-x-4 gap-y-1">
                        <span><code className="font-mono bg-gray-200 px-1 rounded">{'{clientName}'}</code> - Nome do Cliente</span>
                        <span><code className="font-mono bg-gray-200 px-1 rounded">{'{serviceName}'}</code> - Nome do Serviço</span>
                        <span><code className="font-mono bg-gray-200 px-1 rounded">{'{date}'}</code> - Data</span>
                        <span><code className="font-mono bg-gray-200 px-1 rounded">{'{time}'}</code> - Horário</span>
                        <span><code className="font-mono bg-gray-200 px-1 rounded">{'{professionalName}'}</code> - Nome do Profissional</span>
                    </div>
                    <textarea 
                        value={messageTemplate}
                        onChange={(e) => {
                            setMessageTemplate(e.target.value);
                            if (templateError) setTemplateError('');
                        }}
                        rows={8}
                        className={`w-full p-3 border bg-white text-gray-900 rounded-md focus:outline-none transition-shadow font-mono text-sm ${templateError ? 'border-red-500 focus:ring-2 focus:ring-red-300' : 'border-gray-300 focus:ring-2 focus:ring-pink-300'}`}
                    />
                    {templateError && <p className="text-red-500 text-xs mt-1">{templateError}</p>}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={handleTest} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors">
                        Enviar Teste
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors shadow">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
}