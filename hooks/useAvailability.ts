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
        const dateString = date.toISOString().split('T')[0];
        const slots = await api.getOccupiedSlots(dateString);
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
        
        const dateString = selectedDate.toISOString().split('T')[0];
        
        const holidayException = clinicHolidayExceptions?.find(ex => ex.date === dateString);
        if (holidayException) {
            return holidayException;
        }

        const dayOfWeek = selectedDate.getDay();
        return clinicOperatingHours?.[dayOfWeek];
        
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
        
        const professionalOccupiedSlots = occupiedSlots.filter(slot => slot.professional_id === selectedProfessionalId);

        for (let minutes = startDayMinutes; minutes < endDayMinutes; minutes += interval) {
            const slotStartTime = minutes;
            const slotEndTime = minutes + serviceDuration;
            
            if (slotEndTime > endDayMinutes) continue;

            let isAvailable = true;

            // 1. Verificar sobreposição com o horário de almoço
            if (hasLunchBreak) {
                const overlapsWithLunch = (slotStartTime < lunchEndMinutes && lunchStartMinutes < slotEndTime);
                if (overlapsWithLunch) {
                    isAvailable = false;
                }
            }

            if (!isAvailable) continue;

            // 2. Verificar sobreposição com agendamentos existentes
            for (const occupied of professionalOccupiedSlots) {
                const occupiedStart = timeToMinutes(occupied.booking_time);
                const occupiedEnd = occupiedStart + occupied.duration;
                
                // Ignorar o agendamento que está sendo editado/reagendado
                if (bookingToIgnoreId && bookingToIgnoreId === occupied.id) continue;

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