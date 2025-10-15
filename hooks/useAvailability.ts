import { useState, useEffect, useMemo, useCallback } from 'react';
import { User, OperatingHours, DayOperatingHours, HolidayException, Service, Booking } from '../types';
import * as api from '../services/api';

const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

interface UseAvailabilityProps {
    selectedDate: Date | null;
    selectedProfessionalId: string | null;
    serviceDuration: number;
    clinicOperatingHours: OperatingHours | undefined;
    clinicHolidayExceptions: HolidayException[] | undefined;
    bookingToIgnoreId?: string; // Para reagendamento/edição
}

export const useAvailability = ({
    selectedDate,
    selectedProfessionalId,
    serviceDuration,
    clinicOperatingHours,
    clinicHolidayExceptions,
    bookingToIgnoreId,
}: UseAvailabilityProps) => {
    const [occupiedSlots, setOccupiedSlots] = useState<{ id: string, professional_id: string, booking_time: string, duration: number }[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    const fetchAvailability = useCallback(async (date: Date) => {
        setLoadingAvailability(true);
        // Usamos a data ISO string (YYYY-MM-DD) para a API, que é consistente
        const dateString = date.toISOString().split('T')[0];
        const slots = await api.getOccupiedSlots(dateString);
        // Garantir que o ID seja string para comparação
        setOccupiedSlots(slots.map(s => ({ ...s, id: String(s.id) })));
        setLoadingAvailability(false);
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchAvailability(selectedDate);
        }
    }, [selectedDate, fetchAvailability]);

    const currentDaySettings = useMemo((): DayOperatingHours | undefined => {
        if (!selectedDate) return undefined;
        
        // A data string é usada para buscar exceções (YYYY-MM-DD)
        const dateString = selectedDate.toISOString().split('T')[0];
        
        // 1. Verificar exceções de feriado
        const holidayException = clinicHolidayExceptions?.find(ex => ex.date === dateString);
        if (holidayException) {
            return holidayException;
        }

        // 2. Usar horário padrão
        // O getDay() retorna o dia da semana localmente (0-6)
        const dayOfWeek = selectedDate.getDay();
        // Acessa usando a chave string, pois os dados JSONB do Supabase usam chaves string para objetos.
        return clinicOperatingHours?.[String(dayOfWeek)];
        
    }, [selectedDate, clinicOperatingHours, clinicHolidayExceptions]);

    const isClinicOpen = currentDaySettings?.open;

    const availableTimes = useMemo(() => {
        if (!selectedDate || !selectedProfessionalId || !currentDaySettings || !isClinicOpen) return [];

        const daySettings = currentDaySettings;
        
        if (!daySettings.start || !daySettings.end) {
            return [];
        }

        const startDayMinutes = timeToMinutes(daySettings.start);
        const endDayMinutes = timeToMinutes(daySettings.end);
        const interval = 30; // Slots de 30 em 30 minutos
        
        const lunchStartMinutes = daySettings.lunchStart ? timeToMinutes(daySettings.lunchStart) : -1;
        const lunchEndMinutes = daySettings.lunchEnd ? timeToMinutes(daySettings.lunchEnd) : -1;
        const hasLunchBreak = lunchStartMinutes !== -1 && lunchEndMinutes !== -1;

        const times: string[] = [];
        
        // Filtra slots ocupados apenas para o profissional selecionado
        const professionalOccupiedSlots = occupiedSlots.filter(slot => slot.professional_id === selectedProfessionalId);

        // Calcula o início do dia atual em minutos (para evitar agendamentos no passado)
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isToday = selectedDate.toDateString() === today.toDateString();
        const currentMinutes = isToday ? (now.getHours() * 60) + now.getMinutes() : -1;

        for (let minutes = startDayMinutes; minutes < endDayMinutes; minutes += interval) {
            const slotStartTime = minutes;
            const slotEndTime = minutes + serviceDuration;
            
            // 1. Verificar se o slot já passou (apenas para o dia atual)
            if (isToday && slotStartTime < currentMinutes) continue;

            // 2. Verificar se o serviço termina antes do fim do dia
            if (slotEndTime > endDayMinutes) continue;

            let isAvailable = true;

            // 3. Verificar sobreposição com o horário de almoço
            if (hasLunchBreak) {
                // Um slot se sobrepõe ao almoço se:
                // O slot começar antes do fim do almoço E o almoço começar antes do fim do slot.
                const overlapsWithLunch = (slotStartTime < lunchEndMinutes && lunchStartMinutes < slotEndTime);
                if (overlapsWithLunch) {
                    isAvailable = false;
                }
            }

            if (!isAvailable) continue;

            // 4. Verificar sobreposição com agendamentos existentes
            for (const occupied of professionalOccupiedSlots) {
                const occupiedStart = timeToMinutes(occupied.booking_time);
                const occupiedEnd = occupiedStart + occupied.duration;
                
                // Ignorar o agendamento que está sendo editado/reagendado
                if (bookingToIgnoreId && bookingToIgnoreId === occupied.id) continue;

                // Um slot se sobrepõe a um agendamento se:
                // O slot começar antes do fim do agendamento E o agendamento começar antes do fim do slot.
                const overlaps = (slotStartTime < occupiedEnd && occupiedStart < slotEndTime);

                if (overlaps) {
                    isAvailable = false;
                    break;
                }
            }

            if (isAvailable) {
                times.push(minutesToTime(minutes));
            }
        }

        return times;
    }, [selectedDate, selectedProfessionalId, occupiedSlots, serviceDuration, bookingToIgnoreId, currentDaySettings, isClinicOpen]);

    return {
        availableTimes,
        loadingAvailability,
        currentDaySettings,
        isClinicOpen,
        occupiedSlots,
    };
};