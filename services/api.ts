// ... (código anterior)

export const addOrUpdateBooking = async (booking: Partial<Booking> & { serviceName?: string }): Promise<Booking | null> => {
    if (!booking.date) {
        console.error("Booking date is required.");
        return null;
    }
    
    // Formata a data e hora para o formato do banco de dados (YYYY-MM-DD e HH:MM)
    const dateObj = booking.date;
    
    // Garante que a data seja YYYY-MM-DD (parte da data local)
    const bookingDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    // Garante que a hora seja HH:MM (parte da hora local)
    const bookingTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    
    const payload = {
        // Se for string vazia (''), transforma em null para o banco de dados
        user_id: booking.userId && booking.userId !== '' ? booking.userId : null, 
        service_id: booking.serviceId,
        professional_id: booking.professionalId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: booking.status,
        notes: booking.comment,
        duration: booking.duration,
        service_name: booking.serviceName,
        recurring_rule_id: booking.recurringRuleId || null, // NOVO CAMPO
    };

    if (booking.id && !booking.id.startsWith('R-')) {
// ... (restante do código)